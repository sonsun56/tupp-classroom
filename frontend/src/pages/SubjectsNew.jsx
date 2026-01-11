import React, { useEffect, useState } from "react";
import api from "../api";

export default function SubjectsNew({ user, onOpenSubject }) {
  // ===== AUTH GUARD (ครูเท่านั้น) =====
  if (user.role !== "teacher") {
    return (
      <div className="card">
        <h3>⛔ ไม่มีสิทธิ์เข้าถึง</h3>
        <p className="text-sm">
          หน้านี้สำหรับครูเท่านั้น นักเรียนไม่สามารถเข้าใช้งานได้
        </p>
      </div>
    );
  }

  const [subjects, setSubjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [grade, setGrade] = useState(5);
  const [classroom, setClassroom] = useState(1);

  const loadSubjects = async () => {
    const res = await api.get("/subjects", {
      params: {
        role: "teacher",
        userId: user.id,
      },
    });
    setSubjects(res.data || []);
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const createSubject = async () => {
    if (!name.trim()) {
      return alert("กรุณากรอกชื่อรายวิชา");
    }

    await api.post("/subjects", {
      name,
      teacher_id: user.id,
      visibility_mode: visibility,
      target_grade_level:
        visibility === "all" ? null : grade,
      target_classroom:
        visibility === "classroom" ? classroom : null,
    });

    setName("");
    setVisibility("all");
    setShowCreate(false);
    loadSubjects();
  };

  return (
    <div>
      <h2>📚 รายวิชาของฉัน</h2>

      <button
        className="btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => setShowCreate(!showCreate)}
      >
        ➕ สร้างรายวิชา
      </button>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <input
            className="input"
            placeholder="ชื่อรายวิชา"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="all">ทุกห้อง</option>
            <option value="grade">เฉพาะระดับ</option>
            <option value="classroom">เฉพาะห้อง</option>
          </select>

          {visibility !== "all" && (
            <div className="grid-2">
              <select
                className="input"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    ม.{g}
                  </option>
                ))}
              </select>

              {visibility === "classroom" && (
                <select
                  className="input"
                  value={classroom}
                  onChange={(e) =>
                    setClassroom(Number(e.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <option key={c} value={c}>
                      ห้อง {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button className="btn-primary" onClick={createSubject}>
            บันทึก
          </button>
        </div>
      )}

      <div className="card-list">
        {subjects.map((s) => (
          <button
            key={s.id}
            className="card subject-card"
            onClick={() => onOpenSubject(s)} // ✅ ตรงกับ Home.jsx
          >
            <div className="card-title">{s.name}</div>
            <div className="text-xs">
              {s.visibility_mode === "all" && "ทุกห้อง"}
              {s.visibility_mode === "grade" &&
                `ม.${s.target_grade_level}`}
              {s.visibility_mode === "classroom" &&
                `ม.${s.target_grade_level} ห้อง ${s.target_classroom}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
