// src/pages/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function StudentDashboard({ user, onOpenAssignment }) {
  const [assignments, setAssignments] = useState([]);

  const loadData = async () => {
    try {
      const res = await api.get("/subjects", {
        params: {
          role: user.role,
          userId: user.id,
          grade_level: user.grade_level,
          classroom: user.classroom,
        },
      });
      const subjects = res.data || [];
      const all = [];

      for (const subj of subjects) {
        const r = await api.get(`/subjects/${subj.id}/assignments`, {
          params: { student_id: user.id },
        });
        (r.data || []).forEach((a) => {
          all.push({ ...a, subject_name: subj.name });
        });
      }
      setAssignments(all);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();

  const parseDate = (d) => (d ? new Date(d) : null);

  const upcoming = assignments
    .filter((a) => {
      const d = parseDate(a.deadline);
      return d && d >= now && !a.submitted;
    })
    .sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline))
    .slice(0, 5);

  const overdue = assignments
    .filter((a) => {
      const d = parseDate(a.deadline);
      return d && d < now && !a.submitted;
    })
    .sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline))
    .slice(0, 5);

  const done = assignments
    .filter((a) => a.submitted)
    .slice(0, 5);

  return (
    <div className="studentdash-container">
      <h2 className="page-title">✨ สรุปงานของฉัน</h2>

      <div className="studentdash-cards">
        <div className="studentdash-card">
          <div className="studentdash-card-label">งานทั้งหมด</div>
          <div className="studentdash-card-number">
            {assignments.length}
          </div>
        </div>

        <div className="studentdash-card">
          <div className="studentdash-card-label">งานยังไม่ส่ง</div>
          <div className="studentdash-card-number">
            {assignments.filter((a) => !a.submitted).length}
          </div>
        </div>

        <div className="studentdash-card">
          <div className="studentdash-card-label">ส่งแล้ว</div>
          <div className="studentdash-card-number">
            {assignments.filter((a) => a.submitted).length}
          </div>
        </div>
      </div>

      <div className="studentdash-sections">
        <div className="studentdash-block">
          <h3>⏰ งานใกล้กำหนด</h3>
          {upcoming.length === 0 && (
            <p className="empty-text">ตอนนี้ไม่มีงานใกล้กำหนด</p>
          )}
          {upcoming.map((a) => (
            <div
              key={a.id}
              className="studentdash-row"
              onClick={() => onOpenAssignment(a)}
            >
              <div>
                <div className="studentdash-row-title">{a.title}</div>
                <div className="studentdash-row-sub">
                  วิชา {a.subject_name} • กำหนดส่ง {a.deadline}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="studentdash-block">
          <h3>🚨 งานค้าง/เลยกำหนด</h3>
          {overdue.length === 0 && (
            <p className="empty-text">ยอดเยี่ยม! ไม่มีงานสาย</p>
          )}
          {overdue.map((a) => (
            <div
              key={a.id}
              className="studentdash-row overdue"
              onClick={() => onOpenAssignment(a)}
            >
              <div>
                <div className="studentdash-row-title">{a.title}</div>
                <div className="studentdash-row-sub">
                  วิชา {a.subject_name} • เลยกำหนด {a.deadline}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="studentdash-block">
          <h3>✅ งานที่ส่งล่าสุด</h3>
          {done.length === 0 && (
            <p className="empty-text">ยังไม่มีงานที่ส่งแล้ว</p>
          )}
          {done.map((a) => (
            <div
              key={a.id}
              className="studentdash-row done"
              onClick={() => onOpenAssignment(a)}
            >
              <div>
                <div className="studentdash-row-title">{a.title}</div>
                <div className="studentdash-row-sub">
                  วิชา {a.subject_name} • ส่งแล้ว
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
