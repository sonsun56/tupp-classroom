// src/pages/SubjectPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function SubjectPage({ subject, user, onBack, onOpenAssignment, onOpenChat }) {
  const [assignments, setAssignments] = useState([]);
  const [sortMode, setSortMode] = useState("due"); // due | newest | oldest

  const loadAssignments = async () => {
    try {
      const res = await api.get(`/subjects/${subject.id}/assignments`);
      setAssignments(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [subject?.id]);

  const parseDate = (d) => (d ? new Date(d) : null);

  const sortedAssignments = [...assignments].sort((a, b) => {
    const da = parseDate(a.deadline);
    const db = parseDate(b.deadline);

    if (sortMode === "due") {
      if (!da || !db) return 0;
      return da - db; // ใกล้กำหนดก่อน
    }
    if (sortMode === "newest") {
      return (b.id || 0) - (a.id || 0);
    }
    if (sortMode === "oldest") {
      return (a.id || 0) - (b.id || 0);
    }
    return 0;
  });

  const statusClass = (a) => {
    if (a.is_late) return "assign-badge-late";
    if (a.submitted) return "assign-badge-done";
    return "assign-badge-pending";
  };

  return (
    <div className="subjectpage-container">
      <button className="subjectpage-back" onClick={onBack}>
        ← กลับไปหน้ารายวิชา
      </button>

      <div className="subjectpage-header">
        <div className="subjectpage-icon">📘</div>
        <div>
          <h1 className="subjectpage-title">{subject.name}</h1>
          <p className="subjectpage-sub">ครูผู้สอน: {subject.teacher_id}</p>
          <p className="subjectpage-sub">ห้อง: {subject.classroom}</p>
        </div>
      </div>

      <div className="subjectpage-actions">
        <button className="subjectpage-btn1" onClick={onOpenChat}>
          💬 ห้องแชทประจำวิชา
        </button>
      </div>

      <div className="subjectpage-sort-row">
        <h2 className="subjectpage-section-title">📄 ใบงานทั้งหมด</h2>
        <select
          className="subjectpage-sort"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
        >
          <option value="due">ใกล้กำหนดก่อน</option>
          <option value="newest">ใบงานใหม่สุด</option>
          <option value="oldest">ใบงานเก่าสุด</option>
        </select>
      </div>

      <div className="subjectpage-assign-list">
        {sortedAssignments.length === 0 && (
          <p className="empty-text">ยังไม่มีใบงานในรายวิชานี้</p>
        )}

        {sortedAssignments.map((a) => (
          <div key={a.id} className="subjectpage-assign-card">
            <div className="assign-left">
              <div className="assign-icon">📄</div>
              <div>
                <h3 className="assign-name">{a.title}</h3>
                <p className="assign-desc">{a.description}</p>

                <div className="assign-meta">
                  <span className="assign-deadline">⏰ {a.deadline}</span>
                  <span className={`assign-badge ${statusClass(a)}`}>
                    {a.submitted ? "✓ ส่งแล้ว" : a.is_late ? "สาย!" : "ยังไม่ส่ง"}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="assign-btn"
              onClick={() => onOpenAssignment(a)}
            >
              เปิดใบงาน →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
