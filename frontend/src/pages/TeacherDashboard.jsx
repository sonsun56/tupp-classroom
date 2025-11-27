import React, { useEffect, useState } from "react";
import api from "../api"; // ปรับ path ให้ตรงกับโปรเจ็กต์ของเพลิน
import "./TeacherDashboard.css";

const TeacherDashboard = ({ currentUser }) => {
  // currentUser = object จาก login (มี id, name, role, subject ฯลฯ)
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/dashboard/teacher/${currentUser.id}`);
        setAssignments(res.data || []);
      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [currentUser]);

  const totalAssignments = assignments.length;
  const totalSubmitted = assignments.reduce(
    (sum, a) => sum + (a.submitted_count || 0),
    0
  );
  const avgSubmit =
    totalAssignments === 0
      ? 0
      : Math.round(totalSubmitted / totalAssignments);

  if (!currentUser || currentUser.role !== "teacher") {
    return (
      <div className="tdb-page">
        <div className="tdb-card tdb-card-warning">
          <p>หน้านี้สำหรับคุณครูเท่านั้น</p>
        </div>
      </div>
    );
  }

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
        <div className="tdb-header-right">
          <span className="tdb-date">
            {new Date().toLocaleDateString("th-TH", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </header>

      {/* Top Stats */}
      <section className="tdb-stats">
        <div className="tdb-stat-card">
          <p className="tdb-stat-label">จำนวนใบงานทั้งหมด</p>
          <p className="tdb-stat-value">{totalAssignments}</p>
        </div>
        <div className="tdb-stat-card">
          <p className="tdb-stat-label">ยอดส่งงานทั้งหมด</p>
          <p className="tdb-stat-value">{totalSubmitted}</p>
        </div>
        <div className="tdb-stat-card">
          <p className="tdb-stat-label">ค่าเฉลี่ยยอดส่งต่อใบงาน</p>
          <p className="tdb-stat-value">{avgSubmit}</p>
          <span className="tdb-stat-unit">ครั้ง / ใบงาน</span>
        </div>
      </section>

      {/* Main table */}
      <section className="tdb-main">
        <div className="tdb-main-header">
          <h2>ใบงานล่าสุดของคุณครู</h2>
          <span className="tdb-main-count">
            ทั้งหมด {assignments.length} ใบงาน
          </span>
        </div>

        {loading ? (
          <div className="tdb-card tdb-card-muted">กำลังโหลดข้อมูล...</div>
        ) : error ? (
          <div className="tdb-card tdb-card-error">{error}</div>
        ) : assignments.length === 0 ? (
          <div className="tdb-card tdb-card-muted">
            ยังไม่มีใบงานในระบบ ลองสร้างใบงานแรกเลย!
          </div>
        ) : (
          <div className="tdb-card tdb-table-wrapper">
            <table className="tdb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อใบงาน</th>
                  <th>จำนวนที่ส่งแล้ว</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={a.assignment_id}>
                    <td>{idx + 1}</td>
                    <td className="tdb-cell-title">
                      <span className="tdb-dot" />
                      {a.title}
                    </td>
                    <td>
                      <span className="tdb-badge">
                        {a.submitted_count || 0} ส่งแล้ว
                      </span>
                    </td>
                    <td>
                      {/* ปุ่มนี้แล้วแต่เพลินจะลิงก์ไปหน้าไหน */}
                      <button
                        className="tdb-btn-outline"
                        onClick={() => {
                          // ตัวอย่าง: ไปหน้า submissions ของ assignment นั้น
                          // navigate(`/teacher/assignments/${a.assignment_id}/submissions`);
                        }}
                      >
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
