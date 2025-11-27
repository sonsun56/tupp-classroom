import React, { useEffect, useState } from "react";
import api from "../api";
import socket from "../socket";
import "./TeacherDashboard.css";

const TeacherDashboard = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    if (!user || user.role !== "teacher") return;
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/teacher/${user.id}`);
      setAssignments(res.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== "teacher") return;

    const s = socket;
    const refresh = () => loadDashboard();

    s.on("assignments:updated", refresh);
    s.on("submissions:updated", refresh);

    return () => {
      s.off("assignments:updated", refresh);
      s.off("submissions:updated", refresh);
    };
  }, [user?.id]);

  if (loading) return <p>กำลังโหลด...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="tdb-page">
      <div className="tdb-header">
        <div>
          <div className="tdb-title">📘 Dashboard คุณครู</div>
          <div className="tdb-subtitle">ภาพรวมใบงานทั้งหมด</div>
        </div>
        <div className="tdb-header-right">
          <div className="tdb-date">
            {new Date().toLocaleDateString("th-TH")}
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="tdb-card tdb-card-muted">
          ยังไม่มีงานที่สร้างไว้
        </div>
      ) : (
        <>
          <div className="tdb-main-header">
            <h2>รายการใบงาน</h2>
            <div className="tdb-main-count">
              ทั้งหมด {assignments.length} งาน
            </div>
          </div>

          <div className="tdb-table-wrapper">
            <table className="tdb-table">
              <thead>
                <tr>
                  <th>ใบงาน</th>
                  <th>จำนวนผู้ส่ง</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.assignment_id}>
                    <td>
                      <div className="tdb-cell-title">
                        <div className="tdb-dot"></div>
                        {a.title}
                      </div>
                    </td>
                    <td>{a.submitted_count} คน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
