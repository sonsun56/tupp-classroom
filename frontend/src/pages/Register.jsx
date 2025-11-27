// frontend/src/pages/Register.jsx
import React, { useState } from "react";
import api from "../api.js";

const GRADES = [1, 2, 3, 4, 5, 6];
const ROOMS = [1, 2, 3, 4, 5, 6];

export default function Register({ onSwitchToLogin, onRegistered }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [gradeLevel, setGradeLevel] = useState(5);
  const [classroom, setClassroom] = useState(1);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        name,
        email,
        password,
        role,
        grade_level: role === "student" ? gradeLevel : null,
        classroom: role === "student" ? classroom : null,
        student_id: role === "student" ? studentId : null,
        subject: role === "teacher" ? subject : null,
      };
      const res = await api.post("/register", body);
      onRegistered(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">สมัครใช้งาน TUPP CLASSROOM</h1>
        <p className="auth-subtitle">
          เลือกบทบาทให้ถูกต้อง เพื่อให้ระบบแสดงเมนูที่ตรงกับคุณ
        </p>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <label className="text-sm">ชื่อ–นามสกุล</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm">อีเมล</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm">รหัสผ่าน</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm">บทบาท</label>
            <div className="pill-row">
              <button
                type="button"
                className={
                  "pill" + (role === "student" ? " pill-active" : "")
                }
                onClick={() => setRole("student")}
              >
                👩‍🎓 นักเรียน
              </button>
              <button
                type="button"
                className={
                  "pill" + (role === "teacher" ? " pill-active" : "")
                }
                onClick={() => setRole("teacher")}
              >
                👨‍🏫 ครู
              </button>
            </div>
          </div>

          {role === "student" && (
            <>
              <div className="grid-2">
                <div>
                  <label className="text-sm">ระดับชั้น (ม.)</label>
                  <select
                    className="input"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        ม.{g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">ห้อง</label>
                  <select
                    className="input"
                    value={classroom}
                    onChange={(e) => setClassroom(Number(e.target.value))}
                  >
                    {ROOMS.map((r) => (
                      <option key={r} value={r}>
                        ห้อง {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm">รหัสนักเรียน (ตัวเลข 5 หลัก)</label>
                <input
                  className="input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  maxLength={5}
                  required
                />
              </div>
            </>
          )}

          {role === "teacher" && (
            <div>
              <label className="text-sm">วิชาที่รับผิดชอบ</label>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="เช่น คณิตเพิ่มเติม วิทยาศาสตร์ ฯลฯ"
                required
              />
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "กำลังสมัคร..." : "สมัครใช้งาน"}
          </button>
        </form>

        <div className="auth-footer">
          มีบัญชีอยู่แล้ว?{" "}
          <button className="link-btn" onClick={onSwitchToLogin}>
            กลับไปเข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
