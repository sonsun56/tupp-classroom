import "dotenv/config";
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import cloudinary from "./cloudinary.js";
import uploadCloud from "./upload.js";
import streamifier from "streamifier";

/* ================= PATH ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= BASIC SETUP ================= */
const app = express();
app.set("trust proxy", 1);

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 4000;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ================= DB ================= */
const DB_FILE = path.join(__dirname, "school.db");
sqlite3.verbose();
const db = new sqlite3.Database(DB_FILE);

/* ================= LOCAL UPLOAD (disk) ================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = path.basename(file.originalname).replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const uploadDisk = multer({ storage: diskStorage });

app.use("/uploads", express.static(UPLOAD_DIR));

/* ================= HEALTH ================= */
app.get("/", (_, res) => res.send("Backend is running"));

/* ================= HELPERS ================= */
const baseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const mapUserRow = (row, req) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  grade_level: row.grade_level,
  classroom: row.classroom,
  student_id: row.student_id,
  subject: row.subject,
  avatar_url: row.avatar_path
    ? `${baseUrl(req)}/uploads/${path.basename(row.avatar_path)}`
    : null
});

/* ================= AUTH ================= */
app.post("/register", async (req, res) => {
  const { name, email, password, role, grade_level, classroom, student_id, subject } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });

  if (!["student", "teacher"].includes(role))
    return res.status(400).json({ error: "role ไม่ถูกต้อง" });

  if (role === "student" && !/^[0-9]{5}$/.test(student_id || ""))
    return res.status(400).json({ error: "รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก" });

  const hash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users
     (name,email,password,role,grade_level,classroom,student_id,subject)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      name,
      email,
      hash,
      role,
      role === "student" ? grade_level : null,
      role === "student" ? classroom : null,
      role === "student" ? student_id : null,
      role === "teacher" ? subject : null
    ],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      db.get("SELECT * FROM users WHERE id=?", [this.lastID], (e, r) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(mapUserRow(r, req));
      });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
    if (!user) return res.status(400).json({ error: "ไม่พบบัญชีผู้ใช้" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    res.json(mapUserRow(user, req));
  });
});

/* ================= USERS ================= */
app.get("/users", (req, res) => {
  const { role } = req.query;
  let sql = "SELECT * FROM users";
  const params = [];
  if (role) {
    sql += " WHERE role=?";
    params.push(role);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => mapUserRow(r, req)));
  });
});

/* ================= SUBJECTS ================= */
app.post("/subjects", (req, res) => {
  const { name, teacher_id, visibility_mode = "all", target_grade_level, target_classroom } = req.body;
  if (!name || !teacher_id) return res.status(400).json({ error: "ข้อมูลไม่ครบ" });

  db.run(
    `INSERT INTO subjects
     (name,teacher_id,visibility_mode,target_grade_level,target_classroom)
     VALUES (?,?,?,?,?)`,
    [
      name,
      teacher_id,
      visibility_mode,
      visibility_mode === "grade" ? target_grade_level : null,
      visibility_mode === "classroom" ? target_classroom : null
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM subjects WHERE id=?", [this.lastID], (e, r) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(r);
      });
    }
  );
});

app.get("/subjects", (req, res) => {
  const { role, userId, grade_level, classroom } = req.query;
  if (role === "teacher") {
    db.all("SELECT * FROM subjects WHERE teacher_id=? ORDER BY id DESC", [userId], (e, r) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(r);
    });
  } else {
    db.all(
      `
      SELECT * FROM subjects
      WHERE visibility_mode='all'
         OR (visibility_mode='grade' AND target_grade_level=?)
         OR (visibility_mode='classroom' AND target_grade_level=? AND target_classroom=?)
      ORDER BY id DESC
      `,
      [grade_level, grade_level, classroom],
      (e, r) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(r);
      }
    );
  }
});

/* ================= ASSIGNMENTS ================= */
app.get("/subjects/:subjectId/assignments", (req, res) => {
  db.all(
    "SELECT * FROM assignments WHERE subject_id=? ORDER BY id DESC",
    [req.params.subjectId],
    (e, rows) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(
        rows.map((a) => ({
          ...a,
          worksheet_url: a.worksheet_path
            ? `${baseUrl(req)}/uploads/${path.basename(a.worksheet_path)}`
            : null
        }))
      );
    }
  );
});

app.post("/assignments", uploadDisk.single("worksheet"), (req, res) => {
  const { subject_id, title, description, deadline, grading_mode, max_score, require_score } = req.body;
  const worksheet_path = req.file ? req.file.path : null;

  db.run(
    `INSERT INTO assignments
     (subject_id,title,description,deadline,grading_mode,max_score,require_score,worksheet_path)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      subject_id,
      title,
      description || null,
      deadline || null,
      grading_mode || "check",
      grading_mode === "percent" ? max_score || 100 : null,
      require_score === "1" ? 1 : 0,
      worksheet_path
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      io.emit("assignments:updated", { subject_id });
      res.json({ id: this.lastID });
    }
  );
});

/* ================= SUBMISSIONS (Cloudinary – FINAL) ================= */
app.post(
  "/submissions/:assignmentId",
  uploadCloud.array("files", 5),
  async (req, res) => {
    const { assignmentId } = req.params;
    const { student_id } = req.body;
    const files = req.files || [];

    if (!student_id) return res.status(400).json({ error: "ต้องมี student_id" });
    if (!files.length) return res.status(400).json({ error: "ต้องมีไฟล์อย่างน้อย 1 ไฟล์" });

    try {
      const uploadOne = (file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "tupp-classroom/submissions" },
            (err, result) => {
              if (err) reject(err);
              else resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

      const urls = [];
      for (const f of files) urls.push(await uploadOne(f));

      db.get(
        "SELECT id FROM submissions WHERE assignment_id=? AND student_id=?",
        [assignmentId, student_id],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });

          const saveFiles = (sid) => {
            db.run("DELETE FROM submission_files WHERE submission_id=?", [sid]);
            const stmt = db.prepare(
              "INSERT INTO submission_files (submission_id,file_path) VALUES (?,?)"
            );
            urls.forEach((u) => stmt.run(sid, u));
            stmt.finalize();

            io.emit("submissions:updated", {
              assignment_id: Number(assignmentId),
              student_id: Number(student_id)
            });

            res.json({ id: sid, files: urls });
          };

          if (row) {
            saveFiles(row.id);
          } else {
            db.run(
              "INSERT INTO submissions (assignment_id,student_id) VALUES (?,?)",
              [assignmentId, student_id],
              function () {
                saveFiles(this.lastID);
              }
            );
          }
        }
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "upload failed" });
    }
  }
);

app.get("/submissions/:assignmentId", (req, res) => {
  const b = baseUrl(req);
  db.all(
    `SELECT s.*, u.name AS student_name, u.grade_level, u.classroom
     FROM submissions s
     JOIN users u ON u.id=s.student_id
     WHERE s.assignment_id=?`,
    [req.params.assignmentId],
    (e, subs) => {
      if (e) return res.status(500).json({ error: e.message });
      if (!subs.length) return res.json([]);

      const ids = subs.map((s) => s.id);
      db.all(
        `SELECT * FROM submission_files WHERE submission_id IN (${ids.map(() => "?").join(",")})`,
        ids,
        (e2, files) => {
          if (e2) return res.status(500).json({ error: e2.message });

          const by = {};
          files.forEach((f) => {
            (by[f.submission_id] ||= []).push(
              f.file_path.startsWith("http")
                ? f.file_path
                : `${b}/uploads/${path.basename(f.file_path)}`
            );
          });

          res.json(subs.map((s) => ({ ...s, files: by[s.id] || [] })));
        }
      );
    }
  );
});

/* ================= GRADING ================= */
app.post("/submissions/:id/grade", (req, res) => {
  const { grade, feedback } = req.body;
  db.run(
    "UPDATE submissions SET grade=?,feedback=? WHERE id=?",
    [grade, feedback, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "บันทึกคะแนนแล้ว" });
    }
  );
});

/* ================= AVATAR ================= */
app.post("/users/:id/avatar", uploadDisk.single("avatar"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "กรุณาอัปโหลดรูป" });
  db.run(
    "UPDATE users SET avatar_path=? WHERE id=?",
    [req.file.path, req.params.id],
    () =>
      res.json({
        avatar_url: `${baseUrl(req)}/uploads/${path.basename(req.file.path)}`
      })
  );
});

/* ================= CHAT ================= */
app.post("/chat", (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  db.run(
    "INSERT INTO messages (sender_id,receiver_id,content) VALUES (?,?,?)",
    [sender_id, receiver_id, content],
    function () {
      db.get("SELECT * FROM messages WHERE id=?", [this.lastID], (_, row) => {
        io.emit("chat:new", row);
        res.json({ id: this.lastID });
      });
    }
  );
});

app.get("/chat/thread", (req, res) => {
  const { user1, user2 } = req.query;
  db.all(
    `SELECT * FROM messages
     WHERE (sender_id=? AND receiver_id=?)
        OR (sender_id=? AND receiver_id=?)
     ORDER BY datetime(created_at)`,
    [user1, user2, user2, user1],
    (_, rows) => res.json(rows)
  );
});

/* ================= SOCKET ================= */
io.on("connection", (socket) => {
  console.log("user connected:", socket.id);
});

/* ================= START ================= */
httpServer.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
