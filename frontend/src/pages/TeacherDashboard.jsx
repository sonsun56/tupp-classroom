import React, { useEffect, useState } from "react";
import api from "../api";
import "./TeacherDashboard.css";

const TeacherDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ⭐ โหลดข้อมูลผู้ใช้จาก localStorage ตอนเข้าเพจ
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      setCurrentUser(null);
    }
  }, []);

  // ⭐ โหลดข้อมูล dashboard ของครู
  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dashboard/teacher/${currentUser.id}`);
        setAssignments(res.data || []);
      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [currentUser]);

  // ถ้า user ยังโหลดไม่เสร็จ ให้โชว์โหลดก่อน
  if (currentUser === null) {
    return (
      <div className="tdb-page">
        <div className="tdb-card tdb-card-muted">กำลังโหลดข้อมูลผู้ใช้...</div>
      </div>
    );
  }

  // ถ้าไม่ใช่ครู → ห้ามเข้า
  if (currentUser.role !== "teacher") {
    return (
      <div className="tdb-page">
        <div className="tdb-card tdb-card-warning">
          หน้านี้สำหรับคุณครูเท่านั้น
        </div>
      </div>
    );
  }

  const totalAssignments = assignments.length;
  const totalSubmitted = assignments.reduce(
    (sum, a) => sum + (a.submitted_count || 0),
    0
  );
  const avgSubmit =
    totalAssignments === 0
      ? 0
      : Math.round(totalSubmitted / totalAssignments);

  return (
    <div className="tdb-page">

      {/* Header */}
      <header className="tdb-header">
        <div>
          <h1 className="tdb-title">แดชบอร์ดคุณครู</h1>
          <p className="tdb-subtitle">
            {currentUser.name} · {currentUser.subject || "วิชาไม่ระบุ"}
          </p>
        </div>

        <span className="tdb-date">
          {new Date().toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </header>

      {/* Stats */}
      <section className="tdb-stats">
        <div className="tdb-stat-card">
          <p className="tdb-stat-label">จำนวนใบงาน</p>
          <p className="tdb-stat-value">{totalAssignments}</p>
        </div>

        <div className="tdb-stat-card">
          <p className="tdb-stat-label">ยอดส่งงานรวม</p>
          <p className="tdb-stat-value">{totalSubmitted}</p>
        </div>

        <div className="tdb-stat-card">
          <p className="tdb-stat-label">เฉลี่ยต่อใบงาน</p>
          <p className="tdb-stat-value">{avgSubmit}</p>
          <span className="tdb-stat-unit">ครั้ง</span>
        </div>
      </section>

      {/* Table */}
      <section className="tdb-main">
        <div className="tdb-main-header">
          <h2>ใบงานล่าสุด</h2>
          <span className="tdb-main-count">
            ทั้งหมด {assignments.length} ใบงาน
          </span>
        </div>

        {loading ? (
          <div className="tdb-card tdb-card-muted">กำลังโหลด...</div>
        ) : error ? (
          <div className="tdb-card tdb-card-error">{error}</div>
        ) : assignments.length === 0 ? (
          <div className="tdb-card tdb-card-muted">
            ยังไม่มีใบงาน ลองสร้างใบงานแรกเลย!
          </div>
        ) : (
          <div className="tdb-card tdb-table-wrapper">
            <table className="tdb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อใบงาน</th>
                  <th>ส่งแล้ว</th>
                  <th>จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={a.assignment_id}>
                    <td>{idx + 1}</td>
                    <td className="tdb-cell-title">{a.title}</td>
                    <td>
                      <span className="tdb-badge">
                        {a.submitted_count || 0} ส่งแล้ว
                      </span>
                    </td>
                    <td>
                      <button className="tdb-btn-outline">
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherDashboard;
