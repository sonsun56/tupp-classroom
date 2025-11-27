// src/pages/AssignmentDetail.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function AssignmentDetail({ assignment, user, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [files, setFiles] = useState([]);
  const [submitMsg, setSubmitMsg] = useState("");

  const loadSubmissions = async () => {
    try {
      const res = await api.get(`/submissions/${assignment.id}`);
      setSubmissions(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const mySubmission = submissions.find((s) => s.student_id === user.id);

  const submitAssignment = async () => {
    if (!files.length) {
      alert("กรุณาเลือกไฟล์ก่อนส่งนะ");
      return;
    }

    const form = new FormData();
    form.append("student_id", user.id);
    for (const f of files) form.append("files", f);

    try {
      await api.post(`/submissions/${assignment.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitMsg("ส่งงานสำเร็จ 🎉");
      loadSubmissions();
    } catch (e) {
      alert("ส่งงานไม่สำเร็จ ลองใหม่ครับ");
    }
  };

  return (
    <div className="assign-detail-wrapper">

      <button className="assign-back" onClick={onBack}>
        ← กลับไปหน้ารายการใบงาน
      </button>

      <div className="assign-detail-card">
        <h1 className="assign-detail-title">{assignment.title}</h1>

        <p className="assign-detail-desc">{assignment.description}</p>

        <div className="assign-detail-meta">
          <div className="assign-meta-item">
            ⏰ <span>{assignment.deadline}</span>
          </div>

          {assignment.worksheet_url && (
            <div className="assign-meta-item">
              📎 ใบงาน:{" "}
              <a
                href={assignment.worksheet_url}
                target="_blank"
                className="assign-link"
              >
                ดาวน์โหลด
              </a>
            </div>
          )}
        </div>
      </div>

      {/* STUDENT VIEW */}
      {user.role === "student" && (
        <div className="assign-submit-card">
          <h2 className="assign-section-title">📤 ส่งงานของฉัน</h2>

          <input
            type="file"
            multiple
            className="assign-input-file"
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />

          <button className="assign-submit-btn" onClick={submitAssignment}>
            ส่งงาน →
          </button>

          {submitMsg && <p className="assign-success">{submitMsg}</p>}

          {mySubmission && (
            <div className="assign-student-status">
              <h3>สถานะการส่งงาน</h3>
              <p>✓ ส่งแล้ว</p>
              {mySubmission.files?.map((url, idx) => (
                <a key={idx} href={url} target="_blank" className="assign-file-link">
                  ไฟล์ที่ {idx + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEACHER VIEW */}
      {user.role === "teacher" && (
        <div className="assign-teacher-card">
          <h2 className="assign-section-title">
            รายชื่อนักเรียนที่ส่งงาน ({submissions.length})
          </h2>

          {submissions.map((s) => (
            <div key={s.id} className="assign-teacher-row">
              <div className="assign-teacher-info">
                <strong>{s.student_name}</strong>  
                <span className="assign-small">
                  ม.{s.grade_level}/{s.classroom}
                </span>
                <div className="assign-file-list">
                  {s.files?.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" className="assign-file-link">
                      ไฟล์ {idx + 1}
                    </a>
                  ))}
                </div>
              </div>

              <div className="assign-grade-box">
                คะแนน: {s.grade ?? "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
