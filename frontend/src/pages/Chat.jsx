// frontend/src/pages/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import socket from "../socket"; // ใช้ socket กลาง

export default function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const msgEndRef = useRef(null);
  const socketRef = useRef(socket);

  // Auto scroll
  const scrollDown = () => {
    setTimeout(() => {
      msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // โหลดรายชื่อ users ที่คุยได้
  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      // filter ตัวเองออก
      const us = res.data.filter((u) => u.id !== user.id);
      setUsers(us);
    } catch (e) {
      console.error(e);
    }
  };

  // โหลด messages 1:1
  const loadThread = async (targetUser) => {
    try {
      const res = await api.get("/chat/thread", {
        params: {
          user1: user.id,
          user2: targetUser.id,
        },
      });
      setMessages(res.data || []);
      scrollDown();
    } catch (e) {
      console.error(e);
    }
  };

  // ตั้งเป้าหมายที่จะคุย
  const selectUser = (u) => {
    setTarget(u);
    loadThread(u);
  };

  // ส่งข้อความ
  const sendMessage = async () => {
    if (!text.trim() || !target) return;
    try {
      await api.post("/chat", {
        sender_id: user.id,
        receiver_id: target.id,
        message: text.trim(),
      });
      setText("");
    } catch (e) {
      console.error(e);
    }
  };

  // Enter ส่งข้อความ
  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // โหลดรายชื่อ users ตอนเข้า page
  useEffect(() => {
    loadUsers();
  }, []);

  // === 🔥 realtime listener ===
  useEffect(() => {
    const s = socketRef.current;

    const handleIncoming = (m) => {
      // เช็คว่า msg นี้เป็นของห้องที่เราเปิดอยู่ไหม
      const match =
        (m.sender_id === user.id && m.receiver_id === target?.id) ||
        (m.sender_id === target?.id && m.receiver_id === user.id);

      if (match) {
        setMessages((prev) => [...prev, m]);
        scrollDown();
      }
    };

    s.on("chat:new", handleIncoming);

    return () => {
      s.off("chat:new", handleIncoming);
    };
  }, [user.id, target?.id]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h3 className="chat-title">รายชื่อผู้ติดต่อ</h3>

        {users.length === 0 && <p className="text-sm">ไม่มีผู้ใช้เลย</p>}

        {users.map((u) => (
          <button
            key={u.id}
            className={
              "chat-user-btn" + (target?.id === u.id ? " active" : "")
            }
            onClick={() => selectUser(u)}
          >
            <div className="chat-user-name">{u.name}</div>
            <div className="chat-user-role">{u.role}</div>
          </button>
        ))}
      </div>

      <div className="chat-main">
        {!target && (
          <div className="text-sm">เลือกผู้ใช้จากทางซ้ายเพื่อเริ่มคุย</div>
        )}

        {target && (
          <>
            <div className="chat-header">
              💬 คุยกับ {target.name} (ID {target.id})
            </div>

            <div className="chat-box">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "chat-msg " +
                    (m.sender_id === user.id ? "chat-msg-me" : "chat-msg-other")
                  }
                >
                  <div className="chat-msg-text">{m.message}</div>
                  <div className="chat-msg-time">{m.created_at}</div>
                </div>
              ))}

              <div ref={msgEndRef}></div>
            </div>

            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="พิมพ์ข้อความ..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
              />
              <button className="btn-primary" onClick={sendMessage}>
                ➤ ส่ง
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
