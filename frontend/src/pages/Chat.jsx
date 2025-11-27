// frontend/src/pages/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import socket from "../socket";

export default function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const msgEndRef = useRef(null);
  const socketRef = useRef(socket);

  const scrollDown = () => {
    setTimeout(() => {
      msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.filter((u) => u.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

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

  const selectUser = (u) => {
    setTarget(u);
    loadThread(u);
  };

  // 🔥 แก้ชื่อ message → content ให้ตรง backend
  const sendMessage = async () => {
    if (!text.trim() || !target) return;
    try {
      await api.post("/chat", {
        sender_id: user.id,
        receiver_id: target.id,
        content: text.trim(), // <--- สำคัญมาก!
      });
      setText("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const s = socketRef.current;

    const handleIncoming = (m) => {
      const isMatch =
        (m.sender_id === user.id && m.receiver_id === target?.id) ||
        (m.sender_id === target?.id && m.receiver_id === user.id);

      if (isMatch) {
        setMessages((prev) => [...prev, m]);
        scrollDown();
      }
    };

    s.on("chat:new", handleIncoming);
    return () => s.off("chat:new", handleIncoming);
  }, [target?.id, user.id]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h3 className="chat-title">รายชื่อผู้ติดต่อ</h3>

        {users.map((u) => (
          <button
            key={u.id}
            className={
              "chat-user-btn " + (target?.id === u.id ? "active" : "")
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
          <div className="text-sm" style={{ padding: 10 }}>
            เลือกผู้ใช้จากทางซ้ายเพื่อเริ่มคุย
          </div>
        )}

        {target && (
          <>
            <div className="chat-header">
              💬 คุยกับ {target.name} (ID {target.id})
            </div>

            <div className="chat-box">
              {messages.map((m) => {
                const textValue =
                  m.content ||
                  m.message ||
                  m.message_text ||
                  m.text ||
                  m.body ||
                  "";

                const time =
                  m.created_at || m.timestamp || m.time || "";

                return (
                  <div
                    key={m.id}
                    className={
                      "chat-msg " +
                      (m.sender_id === user.id
                        ? "chat-msg-me"
                        : "chat-msg-other")
                    }
                  >
                    <div className="chat-msg-text">{textValue}</div>
                    {time && <div className="chat-msg-time">{time}</div>}
                  </div>
                );
              })}
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
