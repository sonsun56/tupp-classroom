// frontend/src/pages/TeacherDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api.js";

export default function TeacherDashboard({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/teacher/${user.id}`);
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const filtered = rows.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">แดชบอร์ดครู</h2>
          <p className="panel-subtitle">
            สรุปจำนวนผู้ส่งงานตามใบงานที่คุณสร้าง
          </p>
        </div>
        <input
          className="input"
          placeholder="ค้นหาชื่อใบงาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm">กำลังโหลดข้อมูล...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-sm">ยังไม่มีใบงานในระบบ</div>
      )}

      <div className="card-list">
        {filtered.map((r) => (
          <div key={r.assignment_id} className="card assignment-card">
            <div className="card-title-row">
              <div className="card-title">{r.title}</div>
              <div className="badge">
                ส่งแล้ว {r.submitted_count} งาน
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
