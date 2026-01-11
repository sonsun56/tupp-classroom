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
const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

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
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${path.basename(file.originalname).replace(/\s+/g, "_")}`)
});
const uploadDisk = multer({ storage: diskStorage });

app.use("/uploads", express.static(UPLOAD_DIR));

/* ================= HEALTH CHECK ================= */
app.get("/", (_, res) => res.send("Backend is running"));

/* ================= HELPERS ================= */
const baseUrl = (req) => `${req.protocol}://${req.get("host")}`;

/* ================= AUTH ================= */
app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });

  const hash = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)",
    [name, email, hash, role],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  });
});

/* ================= ASSIGNMENTS ================= */
app.post("/assignments", uploadDisk.single("worksheet"), (req, res) => {
  const { subject_id, title } = req.body;
  const worksheet_path = req.file ? req.file.path : null;

  db.run(
    "INSERT INTO assignments (subject_id,title,worksheet_path) VALUES (?,?,?)",
    [subject_id, title, worksheet_path],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

/* ================= AVATAR ================= */
app.post("/users/:id/avatar", uploadDisk.single("avatar"), (req, res) => {
  const { id } = req.params;
  const avatar_path = req.file?.path || null;

  db.run(
    "UPDATE users SET avatar_path=? WHERE id=?",
    [avatar_path, id],
    (err) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({
        avatar_url: avatar_path
          ? `${baseUrl(req)}/uploads/${path.basename(avatar_path)}`
          : null
      });
    }
  );
});

/* ================= SUBMISSIONS (Cloudinary) ================= */
app.post(
  "/submissions/:assignmentId",
  uploadCloud.array("files", 5),
  async (req, res) => {
    const { assignmentId } = req.params;
    const { student_id } = req.body;
    const files = req.files || [];

    if (!student_id)
      return res.status(400).json({ error: "ต้องมี student_id" });
    if (!files.length)
      return res.status(400).json({ error: "ต้องมีไฟล์อย่างน้อย 1 ไฟล์" });

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

          const saveFiles = (subId) => {
            db.run("DELETE FROM submission_files WHERE submission_id=?", [subId]);
            const stmt = db.prepare(
              "INSERT INTO submission_files (submission_id,file_path) VALUES (?,?)"
            );
            urls.forEach((u) => stmt.run(subId, u));
            stmt.finalize();

            io.emit("submissions:updated", {
              assignment_id: Number(assignmentId),
              student_id: Number(student_id)
            });

            res.json({ id: subId, files: urls });
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

/* ================= GET SUBMISSIONS ================= */
app.get("/submissions/:assignmentId", (req, res) => {
  const { assignmentId } = req.params;
  const b = baseUrl(req);

  db.all(
    `SELECT s.id AS submission_id,s.student_id,f.file_path
     FROM submissions s
     LEFT JOIN submission_files f ON s.id=f.submission_id
     WHERE s.assignment_id=?`,
    [assignmentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const map = {};
      rows.forEach((r) => {
        if (!map[r.submission_id]) {
          map[r.submission_id] = {
            submission_id: r.submission_id,
            student_id: r.student_id,
            files: []
          };
        }
        if (r.file_path) {
          map[r.submission_id].files.push(
            r.file_path.startsWith("http")
              ? r.file_path
              : `${b}/uploads/${path.basename(r.file_path)}`
          );
        }
      });

      res.json(Object.values(map));
    }
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
