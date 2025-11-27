// frontend/src/pages/Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../api.js";
import { io } from "socket.io-client";

export default function ChatPage({ user }) {
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");

  // filter รายชื่อ
  const [searchUser, setSearchUser] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadThread = async (t) => {
    if (!t) return;
    try {
      const res = await api.get("/chat/thread", {
        params: { user1: user.id, user2: t.id },
      });
      setMessages(res.data || []);
      scrollDown();
    } catch (e) {
      console.error(e);
    }
  };

  const scrollDown = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  const sendMessage = async () => {
    if (!target) {
      alert("กรุณาเลือกคู่สนทนาก่อน");
      return;
    }
    if (!msg.trim()) return;
    try {
      await api.post("/chat", {
        sender_id: user.id,
        receiver_id: target.id,
        content: msg.trim(),
      });
      setMsg("");
      // ไม่ต้องโหลดใหม่ทันที รอ socket ดันให้
    } catch (e) {
      console.error(e);
    }
  };

  // ส่งด้วย Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const socket = io(api.defaults.baseURL || "http://localhost:4000");
    socketRef.current = socket;

    socket.on("chat:new", (m) => {
      if (
        (m.sender_id === user.id && m.receiver_id === target?.id) ||
        (m.sender_id === target?.id && m.receiver_id === user.id)
      ) {
        setMessages((prev) => [...prev, m]);
        scrollDown();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, target?.id]);

  useEffect(() => {
    if (target) loadThread(target);
  }, [target?.id]);

  const filteredUsers = users
    .filter((u) => u.id !== user.id)
    .filter((u) => {
      if (searchUser.trim()) {
        const q = searchUser.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (gradeFilter && String(u.grade_level) !== gradeFilter) return false;
      if (roomFilter && String(u.classroom) !== roomFilter) return false;
      return true;
    });

  return (
    <div className="chat-layout">
      <div className="chat-users">
        <div className="chat-users-header">
          <h3 className="panel-title">รายชื่อผู้ใช้</h3>
          <input
            className="input"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
          <div className="filter-row">
            <select
              className="input input-xs"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="">ทุกระดับชั้น</option>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  ม.{g}
                </option>
              ))}
            </select>
            <select
              className="input input-xs"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
            >
              <option value="">ทุกห้อง</option>
              {[1, 2, 3, 4, 5, 6].map((r) => (
                <option key={r} value={r}>
                  ห้อง {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chat-users-list">
          {filteredUsers.map((u) => (
            <button
              key={u.id}
              className={
                "chat-user-item" + (target?.id === u.id ? " chat-user-active" : "")
              }
              onClick={() => setTarget(u)}
            >
              <div className="avatar-circle">
                {u.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="chat-user-name">{u.name}</div>
                <div className="text-xs">
                  {u.role === "teacher"
                    ? "ครู"
                    : `ม.${u.grade_level} ห้อง ${u.classroom}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {!target && (
          <div className="text-sm">เลือกผู้ใช้ด้านซ้ายเพื่อเริ่มสนทนา</div>
        )}

        {target && (
          <>
            <div className="chat-main-header">
              <div className="avatar-circle">
                {target.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="chat-user-name">{target.name}</div>
                <div className="text-xs">
                  {target.role === "teacher"
                    ? `ครู ${target.subject || ""}`
                    : `ม.${target.grade_level} ห้อง ${target.classroom}`}
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((m) => {
                const isMe = m.sender_id === user.id;
                return (
                  <div
                    key={m.id}
                    className={
                      "chat-bubble " + (isMe ? "chat-bubble-me" : "chat-bubble-other")
                    }
                  >
                    <div className="text-xs">
                      {isMe ? "ฉัน" : target.name}
                    </div>
                    <div>{m.content}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-row">
              <textarea
                className="input chat-input"
                placeholder="พิมพ์ข้อความ แล้วกด Enter เพื่อส่ง (Shift+Enter ขึ้นบรรทัดใหม่)"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
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
