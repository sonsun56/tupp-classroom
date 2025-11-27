// src/pages/AssignmentsNew.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function AssignmentsNew({ subject, user, onOpenAssignment }) {
  const [assignments, setAssignments] = useState([]);

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

  const statusClass = (a) => {
    if (a.is_late) return "assign-badge-late";
    if (a.submitted) return "assign-badge-done";
    return "assign-badge-pending";
  };

  return (
    <div className="assign-container">
      <h2 className="assign-title">📄 ใบงานวิชา {subject?.name}</h2>

      <div className="assign-list">
        {assignments.map((a) => (
          <div key={a.id} className="assign-card">
            <div className="assign-left">
              <div className="assign-icon">📘</div>

              <div>
                <h3 className="assign-name">{a.title}</h3>
                <p className="assign-desc">{a.description}</p>

                <div className="assign-meta">
                  <span className="assign-deadline">⏰ {a.deadline}</span>

                  <span className={`assign-badge ${statusClass(a)}`}>
                    {a.submitted
                      ? "✓ ส่งแล้ว"
                      : a.is_late
                      ? "สาย!"
                      : "ยังไม่ส่ง"}
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
