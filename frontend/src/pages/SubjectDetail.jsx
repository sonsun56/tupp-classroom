// src/pages/SubjectDetail.jsx
import React from "react";
import "../styles.css";

export default function SubjectDetail({ subject, onOpenAssignments, onOpenChat }) {
  return (
    <div className="subject-detail-container">
      <div className="subject-detail-header">
        <div className="subject-detail-icon">📘</div>

        <div>
          <h1 className="subject-detail-title">{subject.name}</h1>
          <p className="subject-detail-sub">
            ครูผู้สอน: {subject.teacher_id}
          </p>
          <p className="subject-detail-sub">
            ห้อง: {subject.classroom}
          </p>
        </div>
      </div>

      <div className="subject-detail-actions">
        <button
          className="subject-detail-btn"
          onClick={onOpenAssignments}
        >
          📄 ดูใบงานทั้งหมด
        </button>

        <button
          className="subject-detail-btn2"
          onClick={onOpenChat}
        >
          💬 แชทประจำวิชา
        </button>
      </div>
    </div>
  );
}
