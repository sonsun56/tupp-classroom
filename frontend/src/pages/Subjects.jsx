// frontend/src/pages/Subjects.jsx
import React, { useEffect, useState } from "react";
import api from "../api.js";

export default function Subjects({ user, onSelect }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const filtered = subjects.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.visibility_mode || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">รายวิชาที่เปิดในระบบ</h2>
          <p className="panel-subtitle">
            เลือกวิชาเพื่อดูใบงานและส่งงาน
          </p>
        </div>
        <div>
          <input
            className="input"
            placeholder="ค้นหาวิชา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="text-sm">กำลังโหลดรายวิชา...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-sm">ยังไม่มีวิชาสำหรับคุณในระบบ</div>
      )}

      <div className="card-list">
        {filtered.map((s) => (
          <button
            key={s.id}
            className="card subject-card"
            onClick={() => onSelect(s)}
          >
            <div className="card-title-row">
              <div className="card-title">{s.name}</div>
              <span className="badge">
                {s.visibility_mode === "all"
                  ? "ทุกห้อง"
                  : s.visibility_mode === "grade"
                  ? `เฉพาะ ม.${s.target_grade_level}`
                  : `ม.${s.target_grade_level} ห้อง ${s.target_classroom}`}
              </span>
            </div>
            <div className="text-xs">
              รหัสวิชา #{s.id} • ครูผู้สอน ID {s.teacher_id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
