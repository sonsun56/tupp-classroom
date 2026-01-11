import React, { useEffect, useState } from "react";
import api from "../api.js";

export default function Subjects({ user, onSelect }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line
  }, [user?.id]);

  const load = async () => {
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

  const filtered = subjects.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">รายวิชา</h2>
          <p className="panel-subtitle">
            เลือกวิชาเพื่อดูใบงานและส่งงาน
          </p>
        </div>
        <input
          className="input"
          placeholder="ค้นหาวิชา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div>กำลังโหลด...</div>}
      {!loading && filtered.length === 0 && (
        <div className="muted">ยังไม่มีรายวิชา</div>
      )}

      <div className="card-list">
        {filtered.map((s) => (
          <button
            key={s.id}
            className="card subject-card"
            onClick={() => onSelect(s)}
          >
            <div className="card-title">{s.name}</div>
            <div className="text-xs muted">
              {s.visibility_mode === "all"
                ? "ทุกห้อง"
                : s.visibility_mode === "grade"
                ? `เฉพาะ ม.${s.target_grade_level}`
                : `ม.${s.target_grade_level}/${s.target_classroom}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
