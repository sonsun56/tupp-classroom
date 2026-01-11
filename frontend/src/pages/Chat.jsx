// src/pages/Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import socket from "../socket";

export default function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const msgEndRef = useRef(null);
  const socketRef = useRef(socket);
  const typingTimeout = useRef(null);

  const scrollDown = () => {
    setTimeout(() => {
      msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 20);
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.filter((u) => u.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

  const loadThread = async (u) => {
    try {
      const res = await api.get("/chat/thread", {
        params: { user1: user.id, user2: u.id },
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

  const sendMessage = async () => {
    if (!text.trim() || !target) return;
    try {
      await api.post("/chat", {
        sender_id: user.id,
        receiver_id: target.id,
        content: text.trim(),
      });
      setText("");
      socketRef.current.emit("chat:typing:stop", {
        from: user.id,
        to: target.id,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      sendMessage();
      return;
    }

    socketRef.current.emit("chat:typing:start", {
      from: user.id,
      to: target?.id,
    });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit("chat:typing:stop", {
        from: user.id,
        to: target?.id,
      });
    }, 1000);
  };

  useEffect(() => {
    loadUsers();
    socketRef.current.emit("user:online", user.id);
  }, []);

  useEffect(() => {
    const s = socketRef.current;

    const onMessage = (m) => {
      const match =
        (m.sender_id === user.id && m.receiver_id === target?.id) ||
        (m.sender_id === target?.id && m.receiver_id === user.id);

      if (match) {
        setMessages((prev) => [...prev, m]);
        scrollDown();
      }
    };

    s.on("chat:new", onMessage);
    s.on("chat:typing:start", ({ from, to }) => {
      if (to === user.id && from === target?.id) setTypingUser(from);
    });
    s.on("chat:typing:stop", ({ from, to }) => {
      if (to === user.id && from === target?.id) setTypingUser(null);
    });
    s.on("user:online", (id) =>
      setOnlineUsers((p) => [...new Set([...p, id])])
    );
    s.on("user:offline", (id) =>
      setOnlineUsers((p) => p.filter((x) => x !== id))
    );

    return () => {
      s.off("chat:new", onMessage);
      s.off("chat:typing:start");
      s.off("chat:typing:stop");
      s.off("user:online");
      s.off("user:offline");
    };
  }, [target?.id]);

  return (
    <div className="chat-container">
      {/* ===== SIDEBAR ===== */}
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
            <span
              className={`status-dot ${
                onlineUsers.includes(u.id) ? "online" : ""
              }`}
            />
            <div>
              <div>{u.name}</div>
              <div className="text-xs">{u.role}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ===== CHAT ===== */}
      <div className="chat-main">
        {!target && (
          <div className="muted" style={{ padding: 12 }}>
            เลือกผู้ใช้เพื่อเริ่มแชท
          </div>
        )}

        {target && (
          <>
            <div className="chat-header">
              💬 {target.name}
              {onlineUsers.includes(target.id) ? " • ออนไลน์" : " • ออฟไลน์"}
            </div>

            <div className="chat-box">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "chat-msg " +
                    (m.sender_id === user.id
                      ? "chat-msg-me"
                      : "chat-msg-other")
                  }
                >
                  <div className="chat-msg-text">{m.content}</div>
                </div>
              ))}

              {typingUser && (
                <div className="typing-indicator">กำลังพิมพ์...</div>
              )}

              <div ref={msgEndRef} />
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
                ส่ง
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
