// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import api from "../api.js";

export default function Login({ onSwitchToRegister, onLoggedIn }) {
  const [email, setEmail] = useState("student@test.com");
  const [password, setPassword] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });
      onLoggedIn(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">TUPP CLASSROOM</h1>
        <p className="auth-subtitle">
          ระบบส่งงานออนไลน์สำหรับนักเรียนและครู
        </p>

        <form
          onSubmit={submit}
          className="auth-form"
        >
          <div>
            <label className="text-sm">อีเมล</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="text-sm">รหัสผ่าน</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="auth-footer">
          ยังไม่มีบัญชี?{" "}
          <button className="link-btn" onClick={onSwitchToRegister}>
            สมัครใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}
