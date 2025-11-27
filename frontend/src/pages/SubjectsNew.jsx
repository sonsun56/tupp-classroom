// src/pages/SubjectsNew.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import "../styles.css";

export default function SubjectsNew({ user, onSelect }) {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");

  const loadSubjects = async () => {
    try {
      const res = await api.get("/subjects", {
        params: {
          role: user.role,
          userId: user.id,
          grade_level: user.grade_level,
          classroom: user.classroom,
        },
      });

      setSubjects(res.data || []);
    } catch (err) {
      console.error("LOAD SUBJECT ERROR:", err);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filtered = subjects.filter((s) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="subjects-container">
      <h2 className="page-title">📚 รายวิชาของฉัน</h2>

      <div className="subjects-toolbar">
        <input
          className="subjects-search"
          placeholder="ค้นหารายวิชา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="subjects-grid">
        {filtered.map((subj) => (
          <div key={subj.id} className="subject-card">
            <div className="subject-icon">
              {subj.icon || "📘"}
            </div>

            <div className="subject-info">
              <h3 className="subject-title">{subj.name}</h3>
              <p className="subject-classroom">
                โดยครู: {subj.teacher_id}
              </p>

              <div className="subject-progress">
                <div
                  className="subject-progress-bar"
                  style={{ width: `100%` }}
                ></div>
              </div>
            </div>

            <button
              className="subject-btn"
              onClick={() => onSelect(subj)}
            >
              เข้าสู่รายวิชา →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
