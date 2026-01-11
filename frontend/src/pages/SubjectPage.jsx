import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function SubjectPage({
  subject,
  user,
  onBack,
  onOpenAssignment,
  onOpenChat,
}) {
  const [assignments, setAssignments] = useState([]);
  const [sortMode, setSortMode] = useState("due");

  useEffect(() => {
    if (!subject || !user) return;
    loadAssignments();
    // eslint-disable-next-line
  }, [subject?.id]);

  const loadAssignments = async () => {
    try {
      const res = await api.get(`/subjects/${subject.id}/assignments`, {
        params: user.role === "student" ? { student_id: user.id } : {},
      });
      setAssignments(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const sorted = [...assignments].sort((a, b) => {
    if (sortMode === "newest") return b.id - a.id;
    if (sortMode === "oldest") return a.id - b.id;
    return new Date(a.deadline || 0) - new Date(b.deadline || 0);
  });

  return (
    <div className="subjectpage-container">
      <button className="subjectpage-back" onClick={onBack}>
        ← กลับ
      </button>

      <h1>{subject.name}</h1>

      <div className="subjectpage-actions">
        <button className="subjectpage-btn1" onClick={onOpenChat}>
          💬 ห้องแชท
        </button>
      </div>

      <div className="subjectpage-sort-row">
        <h2>ใบงาน</h2>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
        >
          <option value="due">ใกล้กำหนด</option>
          <option value="newest">ใหม่สุด</option>
          <option value="oldest">เก่าสุด</option>
        </select>
      </div>

      {sorted.map((a) => (
        <div key={a.id} className="subjectpage-assign-card">
          <div>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
            <span className="muted">⏰ {a.deadline}</span>
          </div>
          <button onClick={() => onOpenAssignment(a)}>
            เปิดใบงาน →
          </button>
        </div>
      ))}
    </div>
  );
}
