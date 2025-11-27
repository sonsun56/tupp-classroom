// src/pages/AssignmentsCalendar.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function AssignmentsCalendar({ user, onOpenAssignment }) {
  const [allAssignments, setAllAssignments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

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
        const r = await api.get(`/subjects/${subj.id}/assignments`);
        (r.data || []).forEach((a) => {
          if (a.deadline) {
            all.push({
              ...a,
              subject_name: subj.name,
            });
          }
        });
      }
      setAllAssignments(all);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatKey = (d) => d.toISOString().slice(0, 10);

  const assignmentsByDate = allAssignments.reduce((acc, a) => {
    const key = a.deadline?.slice(0, 10);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  const monthLabel = currentMonth.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
  });

  const dayAssignments =
    selectedDate && assignmentsByDate[formatKey(selectedDate)];

  return (
    <div className="calendar-container">
      <h2 className="page-title">📆 ปฏิทินงานของฉัน</h2>

      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={() =>
            setCurrentMonth(
              new Date(year, month - 1, 1)
            )
          }
        >
          ←
        </button>
        <div className="calendar-month-label">{monthLabel}</div>
        <button
          className="calendar-nav-btn"
          onClick={() =>
            setCurrentMonth(
              new Date(year, month + 1, 1)
            )
          }
        >
          →
        </button>
      </div>

      <div className="calendar-grid">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}

        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="calendar-cell empty"></div>;
          const key = formatKey(date);
          const hasAssignments = !!assignmentsByDate[key];
          const isSelected =
            selectedDate && formatKey(selectedDate) === key;

          return (
            <div
              key={idx}
              className={
                "calendar-cell day-cell" +
                (hasAssignments ? " has-assign" : "") +
                (isSelected ? " selected" : "")
              }
              onClick={() => {
                setSelectedDate(date);
              }}
            >
              <div className="day-number">{date.getDate()}</div>
              {hasAssignments && (
                <div className="day-dot" />
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-list-section">
        <h3 className="calendar-list-title">
          {selectedDate
            ? `งานวันที่ ${selectedDate.toLocaleDateString("th-TH")}`
            : "เลือกวันที่มีจุดสีเพื่อดูงาน"}
        </h3>

        {selectedDate && (!dayAssignments || dayAssignments.length === 0) && (
          <p className="empty-text">วันนี้ไม่มีงานที่มีกำหนดส่ง</p>
        )}

        {dayAssignments &&
          dayAssignments.map((a) => (
            <div key={a.id} className="calendar-assign-row">
              <div>
                <div className="calendar-assign-title">{a.title}</div>
                <div className="calendar-assign-subject">
                  วิชา: {a.subject_name}
                </div>
              </div>
              <button
                className="calendar-open-btn"
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
