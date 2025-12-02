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
import admin from "firebase-admin"; // เพิ่มตรงนี้

// ===== PATHS & FILES =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "school.db");
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ===== DB INIT =====
sqlite3.verbose();
const db = new sqlite3.Database(DB_FILE);

// ===== SERVER & SOCKET.IO =====
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 4000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// ===== ROOT HEALTH CHECK (สำคัญสำหรับ Render / UptimeRobot) =====
app.get("/", (req, res) => {
  res.status(200).send("Backend is running");
});

// ===== Multer =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + safe);
  },
});
const upload = multer({ storage });

// ===== DB SCHEMA & SEED =====
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('student','teacher')) NOT NULL,
      grade_level INTEGER,
      classroom INTEGER,
      student_id TEXT UNIQUE,
      subject TEXT,
      avatar_path TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      visibility_mode TEXT CHECK(visibility_mode IN ('all','grade','classroom')) NOT NULL DEFAULT 'all',
      target_grade_level INTEGER,
      target_classroom INTEGER,
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      grading_mode TEXT CHECK(grading_mode IN ('check','score10','percent')) NOT NULL DEFAULT 'check',
      max_score INTEGER,
      require_score INTEGER DEFAULT 0,
      worksheet_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      grade TEXT,
      feedback TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS submission_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      teacher_id INTEGER,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // token สำหรับ FCM
  db.run(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      UNIQUE(user_id, token)
    )
  `);

  // seed ถ้าไม่มี user เลย
  db.get("SELECT COUNT(*) AS c FROM users", (err, row) => {
    if (err) return;
    if (row.c === 0) {
      const tPass = bcrypt.hashSync("1234", 10);
      const sPass = bcrypt.hashSync("1234", 10);
      db.run(
        "INSERT INTO users (name,email,password,role,subject) VALUES (?,?,?,?,?)",
        ["ครูตัวอย่าง", "teacher@test.com", tPass, "teacher", "คณิตศาสตร์"],
        function (err2) {
          if (err2) return;
          const teacherId = this.lastID;
          db.run(
            "INSERT INTO users (name,email,password,role,grade_level,classroom,student_id) VALUES (?,?,?,?,?,?,?)",
            [
              "นักเรียนตัวอย่าง",
              "student@test.com",
              sPass,
              "student",
              5,
              1,
              "12345",
            ],
            function (err3) {
              if (err3) return;
              const studentId = this.lastID;
              db.run(
                "INSERT INTO subjects (name,teacher_id,visibility_mode) VALUES (?,?,?)",
                ["คณิตเพิ่มเติม", teacherId, "all"],
                function (err4) {
                  if (err4) return;
                  const subjectId = this.lastID;
                  db.run(
                    "INSERT INTO assignments (subject_id,title,description,deadline,grading_mode,max_score,require_score) VALUES (?,?,?,?,?,?,?)",
                    [
                      subjectId,
                      "ใบงานตัวอย่าง",
                      "ทดลองใช้งานระบบส่งงาน",
                      "2025-12-31",
                      "percent",
                      100,
                      1,
                    ]
                  );
                }
              );
            }
          );
        }
      );
    }
  });
});

// ===== Helper =====
function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function mapUserRow(row, req) {
  const avatar_url = row.avatar_path
    ? `${baseUrl(req)}/uploads/${path.basename(row.avatar_path)}`
    : null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    grade_level: row.grade_level,
    classroom: row.classroom,
    student_id: row.student_id,
    subject: row.subject,
    avatar_url,
  };
}

// ===== Auth: REGISTER =====
app.post("/register", (req, res) => {
  const {
    name,
    email,
    password,
    role,
    grade_level,
    classroom,
    student_id,
    subject,
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
  }
  if (!["student", "teacher"].includes(role)) {
    return res.status(400).json({ error: "role ไม่ถูกต้อง" });
  }

  if (role === "student") {
    if (!/^[0-9]{5}$/.test(student_id || "")) {
      return res
        .status(400)
        .json({ error: "รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก" });
    }
  }

  db.get("SELECT id FROM users WHERE email = ?", [email], (err, rowEmail) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rowEmail) return res.status(400).json({ error: "อีเมลนี้ถูกใช้แล้ว" });

    db.get("SELECT id FROM users WHERE name = ?", [name], (err2, rowName) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (rowName) return res.status(400).json({ error: "ชื่อนี้ถูกใช้แล้ว" });

      const afterStudentCheck = () => {
        bcrypt
          .hash(password, 10)
          .then((hashed) => {
            db.run(
              `INSERT INTO users
               (name,email,password,role,grade_level,classroom,student_id,subject)
               VALUES (?,?,?,?,?,?,?,?)`,
              [
                name,
                email,
                hashed,
                role,
                role === "student" ? grade_level : null,
                role === "student" ? classroom : null,
                role === "student" ? student_id : null,
                role === "teacher" ? subject : null,
              ],
              function (err3) {
                if (err3)
                  return res.status(500).json({ error: err3.message });
                db.get(
                  "SELECT * FROM users WHERE id = ?",
                  [this.lastID],
                  (err4, row) => {
                    if (err4)
                      return res.status(500).json({ error: err4.message });
                    res.json(mapUserRow(row, req));
                  }
                );
              }
            );
          })
          .catch(() =>
            res
              .status(500)
              .json({ error: "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน" })
          );
      };

      if (role === "student") {
        db.get(
          "SELECT id FROM users WHERE student_id = ?",
          [student_id],
          (err3, rowStu) => {
            if (err3) return res.status(500).json({ error: err3.message });
            if (rowStu) {
              return res
                .status(400)
                .json({ error: "รหัสนักเรียนนี้ถูกใช้แล้ว" });
            }
            afterStudentCheck();
          }
        );
      } else {
        afterStudentCheck();
      }
    });
  });
});

// ===== Auth: LOGIN =====
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ error: "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน" });

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: "ไม่พบบัญชีผู้ใช้" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });

    res.json(mapUserRow(user, req));
  });
});

// ===== Save FCM Token =====
app.post("/save-fcm-token", (req, res) => {
  const { user_id, token } = req.body;
  if (!user_id || !token) {
    return res.status(400).json({ error: "ต้องมี user_id และ token" });
  }

  db.run(
    "INSERT OR IGNORE INTO fcm_tokens (user_id, token) VALUES (?, ?)",
    [user_id, token],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// ===== Users list (สำหรับแชท) =====
app.get("/users", (req, res) => {
  const { role } = req.query;
  let sql = "SELECT * FROM users";
  const params = [];
  if (role) {
    sql += " WHERE role = ?";
    params.push(role);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => mapUserRow(r, req)));
  });
});

// ===== Subjects =====
app.post("/subjects", (req, res) => {
  const {
    name,
    teacher_id,
    visibility_mode = "all",
    target_grade_level = null,
    target_classroom = null,
  } = req.body;

  if (!name || !teacher_id) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
  }
  if (!["all", "grade", "classroom"].includes(visibility_mode)) {
    return res.status(400).json({ error: "visibility_mode ไม่ถูกต้อง" });
  }

  db.run(
    `INSERT INTO subjects
     (name,teacher_id,visibility_mode,target_grade_level,target_classroom)
     VALUES (?,?,?,?,?)`,
    [
      name,
      teacher_id,
      visibility_mode,
      visibility_mode === "all" ? null : target_grade_level,
      visibility_mode === "classroom" ? target_classroom : null,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT * FROM subjects WHERE id = ?",
        [this.lastID],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(row);
        }
      );
    }
  );
});

app.get("/subjects", (req, res) => {
  const { role, userId, grade_level, classroom } = req.query;
  if (!role || !userId) {
    return res.status(400).json({ error: "ต้องมี role และ userId" });
  }

  if (role === "teacher") {
    db.all(
      "SELECT * FROM subjects WHERE teacher_id = ? ORDER BY id DESC",
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  } else {
    const g = parseInt(grade_level);
    const c = parseInt(classroom);
    db.all(
      `
      SELECT * FROM subjects
      WHERE
        visibility_mode = 'all'
        OR (visibility_mode = 'grade' AND target_grade_level = ?)
        OR (visibility_mode = 'classroom' AND target_grade_level = ? AND target_classroom = ?)
      ORDER BY id DESC
    `,
      [g, g, c],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  }
});

// ===== Assignments =====
app.get("/subjects/:subjectId/assignments", (req, res) => {
  const { subjectId } = req.params;
  db.all(
    "SELECT * FROM assignments WHERE subject_id = ? ORDER BY id DESC",
    [subjectId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const result = rows.map((a) => ({
        ...a,
        worksheet_url: a.worksheet_path
          ? `${baseUrl(req)}/uploads/${path.basename(a.worksheet_path)}`
          : null,
      }));
      res.json(result);
    }
  );
});

app.post("/assignments", upload.single("worksheet"), (req, res) => {
  const {
    subject_id,
    title,
    description,
    deadline,
    grading_mode = "check",
    max_score,
    require_score,
  } = req.body;

  if (!subject_id || !title) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
  }
  if (!["check", "score10", "percent"].includes(grading_mode)) {
    return res.status(400).json({ error: "grading_mode ไม่ถูกต้อง" });
  }

  const worksheet_path = req.file ? req.file.path : null;
  const max = grading_mode === "percent" ? max_score || 100 : null;
  const reqScore = require_score === "1" ? 1 : 0;

  db.run(
    `INSERT INTO assignments
       (subject_id,title,description,deadline,grading_mode,max_score,require_score,worksheet_path)
       VALUES (?,?,?,?,?,?,?,?)`,
    [
      subject_id,
      title,
      description || null,
      deadline || null,
      grading_mode,
      max,
      reqScore,
      worksheet_path,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT * FROM assignments WHERE id = ?",
        [this.lastID],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({
            ...row,
            worksheet_url: row.worksheet_path
              ? `${baseUrl(req)}/uploads/${path.basename(row.worksheet_path)}`
              : null,
          });
        }
      );
    }
  );
});

// Export grades CSV
app.get("/assignments/:id/export-grades", (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT u.name, u.student_id, u.grade_level, u.classroom, s.grade, s.feedback
     FROM submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.assignment_id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      let csv = "ชื่อ,รหัสนักเรียน,ระดับชั้น,ห้อง,คะแนน,ความคิดเห็น\n";
      rows.forEach((r) => {
        const fb = (r.feedback || "").replace(/,/g, " ");
        csv += `${r.name || ""},${r.student_id || ""},${r.grade_level ||
          ""},${r.classroom || ""},${r.grade || ""},${fb}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="assignment-${id}-grades.csv"`
      );
      res.send(csv);
    }
  );
});

// ===== Submissions =====
app.post(
  "/submissions/:assignmentId",
  upload.array("files", 5),
  (req, res) => {
    const { assignmentId } = req.params;
    const { student_id } = req.body;
    const files = req.files || [];

    if (!student_id) {
      return res.status(400).json({ error: "ต้องมี student_id" });
    }
    if (!files.length) {
      return res
        .status(400)
        .json({ error: "กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์" });
    }

    db.get(
      "SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?",
      [assignmentId, student_id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const handleFiles = (submissionId) => {
          db.run(
            "DELETE FROM submission_files WHERE submission_id = ?",
            [submissionId],
            (err2) => {
              if (err2) console.error(err2);
              const stmt = db.prepare(
                "INSERT INTO submission_files (submission_id,file_path) VALUES (?,?)"
              );
              files.forEach((f) => {
                stmt.run(submissionId, f.path);
              });
              stmt.finalize();
              res.json({ message: "ส่งงานสำเร็จ", id: submissionId });
            }
          );
        };

        if (row) {
          db.run(
            "UPDATE submissions SET grade=NULL, feedback=NULL, created_at=CURRENT_TIMESTAMP WHERE id = ?",
            [row.id],
            (err2) => {
              if (err2) return res.status(500).json({ error: err2.message });
              handleFiles(row.id);
            }
          );
        } else {
          db.run(
            "INSERT INTO submissions (assignment_id,student_id) VALUES (?,?)",
            [assignmentId, student_id],
            function (err2) {
              if (err2) return res.status(500).json({ error: err2.message });
              handleFiles(this.lastID);
            }
          );
        }
      }
    );
  }
);

app.get("/submissions/:assignmentId", (req, res) => {
  const { assignmentId } = req.params;
  const b = baseUrl(req);
  db.all(
    `SELECT s.*, u.name AS student_name, u.grade_level, u.classroom
     FROM submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.assignment_id = ?`,
    [assignmentId],
    (err, subs) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!subs.length) return res.json([]);

      const ids = subs.map((s) => s.id);
      db.all(
        `SELECT * FROM submission_files WHERE submission_id IN (${ids
          .map(() => "?")
          .join(",")})`,
        ids,
        (err2, files) => {
          if (err2) return res.status(500).json({ error: err2.message });
          const filesBySub = {};
          files.forEach((f) => {
            if (!filesBySub[f.submission_id])
              filesBySub[f.submission_id] = [];
            filesBySub[f.submission_id].push(
              `${b}/uploads/${path.basename(f.file_path)}`
            );
          });
          const result = subs.map((s) => ({
            ...s,
            files: filesBySub[s.id] || [],
          }));
          res.json(result);
        }
      );
    }
  );
});

app.post("/submissions/:id/grade", (req, res) => {
  const { id } = req.params;
  const { grade, feedback } = req.body;
  db.run(
    "UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?",
    [grade, feedback, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: "ไม่พบงานนี้" });
      }
      res.json({ message: "บันทึกคะแนนแล้ว" });
    }
  );
});

// ===== Avatar upload =====
app.post("/users/:id/avatar", upload.single("avatar"), (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: "กรุณาอัปโหลดไฟล์รูปภาพ" });
  }
  const mime = req.file.mimetype || "";
  if (!mime.startsWith("image/")) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "ไฟล์ต้องเป็นรูปภาพเท่านั้น" });
  }
  const filePath = req.file.path;
  db.run(
    "UPDATE users SET avatar_path = ? WHERE id = ?",
    [filePath, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const avatar_url = `${baseUrl(req)}/uploads/${path.basename(filePath)}`;
      res.json({ message: "อัปโหลดรูปโปรไฟล์สำเร็จ", avatar_url });
    }
  );
});

// ===== Teacher dashboard =====
app.get("/dashboard/teacher/:teacherId", (req, res) => {
  const { teacherId } = req.params;
  db.all(
    `SELECT a.id AS assignment_id, a.title,
            COUNT(s.id) AS submitted_count
     FROM assignments a
     JOIN subjects sub ON a.subject_id = sub.id
     LEFT JOIN submissions s ON s.assignment_id = a.id
     WHERE sub.teacher_id = ?
     GROUP BY a.id
     ORDER BY a.id DESC`,
    [teacherId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ===== Chat =====
app.post("/chat", (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  if (!sender_id || !receiver_id || !content) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
  }
  db.run(
    "INSERT INTO messages (sender_id,receiver_id,content) VALUES (?,?,?)",
    [sender_id, receiver_id, content],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT * FROM messages WHERE id = ?",
        [this.lastID],
        (err2, row) => {
          if (!err2 && row) {
            io.emit("chat:new", row);
          }
        }
      );
      res.json({ id: this.lastID });
    }
  );
});

app.get("/chat/thread", (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    return res.status(400).json({ error: "ต้องมี user1 และ user2" });
  }
  db.all(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY datetime(created_at) ASC`,
    [user1, user2, user2, user1],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ===== ประกาศรายวิชา =====
app.get("/subjects/:id/announcements", (req, res) => {
  db.all(
    "SELECT a.*, u.name AS teacher_name FROM announcements a INNER JOIN users u ON u.id = a.teacher_id WHERE subject_id = ? ORDER BY id DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ===== Firebase Admin & Push Helper =====
const serviceAccount = {
  project_id: "tupp-classroom",
  client_email: "firebase-adminsdk-fbsvc@tupp-classroom.iam.gserviceaccount.com", // 👉 ใส่ client_email จริงของเพลินในเครื่องตัวเอง
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCOg9zo16O4jpPI\nTk+cgHx3UXVOVGLZaRhlwAp5syupquM75c1s0X96nXktDQs52ppcmVyPmPSaBfQA\ntLOMeqmvAgtnTOGNQ6dvr4qBr1MQ1LxB8NhYT8YxVJIkZ97mMjog9X08DM5VYq9v\ntSXKtUPxxMkrWDdrPl/cKbODa0WIZ16IpMgu7da0j9/x99iWculMA8PJEkc60eqf\nqXfulOvw9yFlqx1Fk+FKmn6dx2FJC6TVw0bp86VEgG0Qwo/jrP/BS4ecVQ7lcwWT\noYOTVUnXHlaBqyx8ATuwbb/YFm6jyjQha6sRtYWpkBG22U9nwqL/dmljTAXUF+cI\nNtWgH4wJAgMBAAECggEAByZ+N3UrouS4bR+MvAKa/BZAsfjm6sHsoPJKiZef6bKI\nFdHDsEwvPrTW8cKKnSZRggg0eNnzmnoQ/NYUKh4KFHH1pi2uerrPFE9KPj57MZ19\ngpDLHLHdSk1UIHJ7tbCwckXkONaVpaVpaEvo76uPk0+hyO8d/LSo9PASBdZ51cxI\nFLjNtbqzNnT+sxyLtOfYBf9BALm8MB15NXUY0DsRprQ5serLsZB+CmxNnvIVLQkJ\nheUiPlNUy8ub+pM6kegez8wbnbzqq/9FwwKDuACczv+g3cJqlb5RSnrxyw18NzQz\nWwsR9QXpqUSSwxG9PxD0f0TxF2EeL+s5JdV5T/J0+QKBgQDC2SX6mlBLrGv7Mf7m\nNtEZDtRzukJKVqNTg1QgMVooUdLMcTh/az7nX7/ynkMLS2l+TU/KPQ/C0Dbe8aYG\nmfZ8ylNCViBncUFyT3TCv41MftoJTLdmiqu1iTQN09PIVZaE4aSXt2/u9slqV+WA\nPaYaJulicuoV2esGjHlQNnmexQKBgQC7PhHWYCXvvOc4KcVrxCONHU69fAzj32Ty\nXK7AQoa/LPbcBaeF/P0lzucn7BOHEbC+aEWX/hzuCCQmhWwyUDzpPx8j0lQ7N14J\nRbyB7qDbNbDuxw0MnA01BKcFduFMDo/fhrI/1ubZzub8uk1UsBjbgqfb5i4lThV9\nQLeAgEHMdQKBgQCP79OzfZ1FWZjnFnbDX8k1ZpQg7X4c5kV+4uwZX/vG/zLmndjr\nn7D3QO9N7gV+6XWDvN7tehATjLaMGRzZkZDZfKjmvzLu12ZOaE3Ls69QzACLkCWH\nVXclArb2Y/315uvrO7jX7sV8VMhTi5zZEDGM7iPH+zXbcIDC9LCFRciwNQKBgBmO\naj7ZVrQ3E1QOF30TA0sycdnZAaVki1GtJsjlC6EyUOtM9kWKdz7e05wWU7/+wSHr\n93u8WlR+1fhQA6mGXBn13Jk2DvsaHoKjeww89sWUuXaNwpEzB3ZyER3k0PFhl2+J\n4fBms5GM9OgPwZhKhMoJNkIEU84Rr0suNx2Z4+E1AoGAaOpQq9oF+aXq1IfCjnbR\nqs2/voLVWerDANk8aL82bw7P4/+cYU6avO0McGlIAEVg+Vi7Lh51d81A0/zShMuq\nvHlyq68KWIsk9S2+1gASxBHS41xJOX+3TP8F0BgSaRy4vjFQqZrEBc4q6nyCn8Tx\nvChXKKHeum94jDowOtp0xps=\n-----END PRIVATE KEY-----\n", // 👉 ใส่ private_key ทั้งก้อน (มี \n อยู่ข้างใน)
};

let adminApp = null;
if (serviceAccount.client_email && serviceAccount.private_key) {
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn(
    "⚠ Firebase Admin ยังไม่ได้ตั้งค่า (ไม่มี client_email/private_key) – ระบบ Push จะไม่ทำงาน แต่ backend ทำงานปกติ"
  );
}

async function sendPushNotification(tokens, title, body) {
  if (!adminApp) return; // ยังไม่ได้ config ก็ข้ามไปเฉย ๆ
  if (!tokens.length) return;

  const message = {
    notification: { title, body },
    tokens,
    webpush: {
      fcmOptions: {
        link: "/?open=announcement",
      },
    },
  };

  try {
    await admin.messaging().sendEachForMulticast(message);
  } catch (err) {
    console.error("sendPushNotification error:", err);
  }
}

app.post("/subjects/:id/announcements", (req, res) => {
  const { teacher_id, content } = req.body;
  if (!teacher_id || !content.trim()) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
  }

  const subjectId = req.params.id;

  db.run(
    `INSERT INTO announcements (subject_id, teacher_id, content) VALUES (?, ?, ?)`,
    [subjectId, teacher_id, content],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const announcement = {
        id: this.lastID,
        subject_id: subjectId,
        teacher_id,
        content,
        created_at: new Date().toISOString(),
      };

      // realtime ไปทุก client
      io.emit("announcement:new", announcement);

      // push ไปยังทุก token ที่มี (เพลินจะมา filter ทีหลังตามห้องก็ได้)
      db.all("SELECT token FROM fcm_tokens", [], async (e2, rows) => {
        if (e2) {
          console.error(e2);
          return;
        }
        const tokens = rows.map((r) => r.token);
        await sendPushNotification(tokens, "📢 ประกาศใหม่!", content);
      });

      res.json(announcement);
    }
  );
});

// ===== Socket.IO =====
io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  // ระบุ user_id
  socket.on("user:online", (userId) => {
    socket.userId = userId;
    io.emit("user:online", userId);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      io.emit("user:offline", socket.userId);
    }
  });

  // Typing indicator
  socket.on("chat:typing:start", ({ from, to }) => {
    io.emit("chat:typing:start", { from, to });
  });

  socket.on("chat:typing:stop", ({ from, to }) => {
    io.emit("chat:typing:stop", { from, to });
  });
});

// ===== START SERVER =====
httpServer.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`📦 DB: ${DB_FILE}`);
});
