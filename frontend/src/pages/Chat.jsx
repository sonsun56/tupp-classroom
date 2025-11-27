import React, { useEffect, useState, useRef } from "react";
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

  const sendMessage = async () => {
    if (!text.trim() || !target) return;
    try {
      await api.post("/chat", {
        sender_id: user.id,
        receiver_id: target.id,
        content: text.trim(),
      });
      setText("");
      socketRef.current.emit("chat:typing:stop", { from: user.id, to: target.id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
    else {
      socketRef.current.emit("chat:typing:start", {
        from: user.id,
        to: target?.id,
      });
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socketRef.current.emit("chat:typing:stop", {
          from: user.id,
          to: target?.id,
        });
      }, 1000);
    }
  };

  useEffect(() => {
    loadUsers();

    // ส่ง event ว่า user นี้ออนไลน์
    socketRef.current.emit("user:online", user.id);
  }, []);

  // Handle realtime messages + typing + online
  useEffect(() => {
    const s = socketRef.current;

    const handleIncoming = (m) => {
      const match =
        (m.sender_id === user.id && m.receiver_id === target?.id) ||
        (m.sender_id === target?.id && m.receiver_id === user.id);

      if (match) {
        setMessages((prev) => [...prev, m]);
        scrollDown();
      }
    };

    const handleTypingStart = ({ from, to }) => {
      if (to === user.id && from === target?.id) {
        setTypingUser(from);
      }
    };

    const handleTypingStop = ({ from, to }) => {
      if (to === user.id && from === target?.id) {
        setTypingUser(null);
      }
    };

    const handleOnline = (userId) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    };

    const handleOffline = (userId) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== userId));
    };

    s.on("chat:new", handleIncoming);
    s.on("chat:typing:start", handleTypingStart);
    s.on("chat:typing:stop", handleTypingStop);
    s.on("user:online", handleOnline);
    s.on("user:offline", handleOffline);

    return () => {
      s.off("chat:new", handleIncoming);
      s.off("chat:typing:start", handleTypingStart);
      s.off("chat:typing:stop", handleTypingStop);
      s.off("user:online", handleOnline);
      s.off("user:offline", handleOffline);
    };
  }, [target?.id, user.id]);

  return (
    <div className="chat-container">
      {/* LEFT SIDEBAR */}
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
            <div className="chat-user-info">
              <span className={`status-dot ${onlineUsers.includes(u.id) ? "online" : ""}`}></span>
              <div className="chat-user-name">{u.name}</div>
            </div>
            <div className="chat-user-role">{u.role}</div>
          </button>
        ))}
      </div>

      {/* MAIN CHAT WINDOW */}
      <div className="chat-main">
        {!target && (
          <div className="text-sm" style={{ padding: 10 }}>
            เลือกผู้ใช้จากทางซ้ายเพื่อเริ่มคุย
          </div>
        )}

        {target && (
          <>
            <div className="chat-header">
              💬 คุยกับ {target.name}  
              {onlineUsers.includes(target.id) ? (
                <span className="online-text"> • ออนไลน์</span>
              ) : (
                <span className="offline-text"> • ออฟไลน์</span>
              )}
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
                    <div className="bubble-tail"></div>
                    <div className="chat-msg-text">{textValue}</div>
                    {time && <div className="chat-msg-time">{time}</div>}
                  </div>
                );
              })}

              {typingUser && (
                <div className="typing-indicator">
                  กำลังพิมพ์...
                </div>
              )}

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
