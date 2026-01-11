// src/pages/AssignmentDetail.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function AssignmentDetail({ assignment, user, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const load = async () => {
    try {
      const res = await api.get(`/submissions/${assignment.id}`);
      setSubmissions(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const mySub = submissions.find((s) => s.student_id === user.id);
  const alreadySubmitted = !!mySub;

  const submit = async () => {
    if (alreadySubmitted) return;
    if (!files.length) return alert("กรุณาเลือกไฟล์ก่อนส่ง");

    const fd = new FormData();
    fd.append("student_id", user.id);
    files.forEach((f) => fd.append("files", f));

    try {
      setLoading(true);
      await api.post(`/submissions/${assignment.id}`, fd);
      setMsg("ส่งงานเรียบร้อยแล้ว 🎉");
      setFiles([]);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "ส่งงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onBack}>← กลับ</button>

      <h1>{assignment.title}</h1>
      <p>{assignment.description}</p>

      {/* ===== STUDENT ===== */}
      {user.role === "student" && (
        <div className="card">
          <h3>📤 ส่งงาน</h3>

          {!alreadySubmitted && (
            <input
              type="file"
              multiple
              onChange={(e) => setFiles([...e.target.files])}
            />
          )}

          <button
            onClick={submit}
            disabled={alreadySubmitted || loading}
          >
            {alreadySubmitted
              ? "✓ ส่งงานแล้ว"
              : loading
              ? "กำลังส่ง..."
              : "ส่งงาน"}
          </button>

          {msg && <p style={{ color: "#16a34a" }}>{msg}</p>}
        </div>
      )}

      {/* ===== TEACHER ===== */}
      {user.role === "teacher" && (
        <div className="card">
          <h3>📋 รายชื่อนักเรียนที่ส่งงาน</h3>
          {submissions.length === 0 && (
            <p className="muted">ยังไม่มีนักเรียนส่งงาน</p>
          )}
          {submissions.map((s) => (
            <div key={s.id}>
              {s.student_name} — คะแนน {s.grade ?? "-"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
