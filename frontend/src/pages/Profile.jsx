// frontend/src/pages/Profile.jsx
import React, { useState } from "react";
import api from "../api.js";

export default function Profile({ user, setUser }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const uploadAvatar = async () => {
    if (!file) return alert("กรุณาเลือกรูปภาพ");
    const form = new FormData();
    form.append("avatar", file);

    try {
      const res = await api.post(`/users/${user.id}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg(res.data.message || "อัปโหลดสำเร็จ");
      if (res.data.avatar_url) {
        const updated = { ...user, avatar_url: res.data.avatar_url };
        setUser(updated);
        localStorage.setItem("tupp_user", JSON.stringify(updated));
      }
    } catch (e) {
      alert(e.response?.data?.error || "อัปโหลดไม่สำเร็จ");
    }
  };

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">โปรไฟล์ของฉัน</h2>
          <p className="panel-subtitle">
            แก้ไขข้อมูลรูปโปรไฟล์และตรวจสอบบทบาทในระบบ
          </p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-main">
          <div className="profile-row">
            <div className="avatar-big">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" />
              ) : (
                <span>{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
              )}
            </div>
            <div>
              <div className="profile-name">{user.name}</div>
              <div className="text-sm">{user.email}</div>
              <div className="text-sm" style={{ marginTop: 6 }}>
                {user.role === "teacher"
                  ? `ครูวิชา ${user.subject || "-"}`
                  : `นักเรียน ม.${user.grade_level} ห้อง ${user.classroom} (รหัส ${user.student_id})`}
              </div>
            </div>
          </div>

          <div className="profile-upload">
            <label className="text-sm">อัปโหลดรูปโปรไฟล์</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button
              className="btn-pill"
              style={{ marginTop: 10 }}
              onClick={uploadAvatar}
            >
              อัปโหลด
            </button>
            {msg && (
              <div className="text-sm" style={{ color: "#16a34a" }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
