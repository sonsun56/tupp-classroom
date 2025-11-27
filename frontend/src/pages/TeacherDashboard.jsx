import React, { useEffect, useState } from "react";
import api from "../api";
import socket from "../socket";
import "./TeacherDashboard.css";

const TeacherDashboard = ({ currentUser }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    if (!currentUser || currentUser.role !== "teacher") return;
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/teacher/${currentUser.id}`);
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
  }, [currentUser?.id]);

  // === Realtime ===
  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") return;

    const s = socket;
    const refresh = () => loadDashboard();

    s.on("assignments:updated", refresh);
    s.on("submissions:updated", refresh);

    return () => {
      s.off("assignments:updated", refresh);
      s.off("submissions:updated", refresh);
    };
  }, [currentUser?.id]);

  if (loading) return <p>กำลังโหลด...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="teacher-dashboard">
      <h2>📘 Dashboard คุณครู</h2>

      {assignments.length === 0 ? (
        <p>ยังไม่มีงานที่คุณสร้างไว้</p>
      ) : (
        <div className="assignment-list">
          {assignments.map((a) => (
            <div key={a.id} className="assignment-card">
              <h3>{a.title}</h3>
              <p>วิชา: {a.subject_name}</p>
              <p>ห้อง: {a.classroom}</p>
              <p>ส่งแล้ว: {a.submissions_count} คน</p>
              <p>ครบกำหนด: {a.due_date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
