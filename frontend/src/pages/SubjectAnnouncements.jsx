import React, { useEffect, useState } from "react";
import api from "../api";
import socket from "../socket";
import "../styles.css";

export default function SubjectAnnouncements({ subject, user }) {
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");

  const loadAnnouncements = async () => {
    try {
      const res = await api.get(`/subjects/${subject.id}/announcements`);
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [subject?.id]);

  // realtime -------------
  useEffect(() => {
    socket.on("announcement:new", (a) => {
      if (a.subject_id == subject.id) {
        setItems((prev) => [a, ...prev]);
      }
    });

    return () => socket.off("announcement:new");
  }, [subject?.id]);

  const postAnnouncement = async () => {
    if (!content.trim()) return;

    await api.post(`/subjects/${subject.id}/announcements`, {
      teacher_id: user.id,
      content,
    });

    setContent("");
  };

  return (
    <div className="announce-container">

      <h2 className="page-title">📢 ประกาศประจำวิชา {subject.name}</h2>

      {user.role === "teacher" && (
        <div className="announce-input-box">
          <textarea
            className="announce-input"
            placeholder="พิมพ์ประกาศสำหรับนักเรียน…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />

          <button className="announce-post-btn" onClick={postAnnouncement}>
            โพสต์ประกาศ
          </button>
        </div>
      )}

      <div className="announce-list">
        {items.map((a) => (
          <div key={a.id} className="announce-card">
            <div className="announce-header">
              <strong>{a.teacher_name}</strong>
              <span>{new Date(a.created_at).toLocaleString("th-TH")}</span>
            </div>
            <div className="announce-content">{a.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
