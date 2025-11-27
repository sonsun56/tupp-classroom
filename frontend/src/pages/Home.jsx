// frontend/src/pages/Home.jsx
import React, { useState } from "react";
import Subjects from "./Subjects.jsx";
import SubjectAssignments from "./SubjectAssignments.jsx";
import TeacherDashboard from "./TeacherDashboard.jsx";
import ChatPage from "./Chat.jsx";
import Profile from "./Profile.jsx";

export default function Home({ user, setUser, onLogout }) {
  const [active, setActive] = useState("subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const selectSubject = (s) => {
    setSelectedSubject(s);
    setActive("assignments");
  };

  const isTeacher = user.role === "teacher";

  return (
    <div className="app-shell">
      <div className="layout-main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-circle">T</div>
            <div>
              <div className="sidebar-title">TUPP CLASSROOM</div>
              <div className="sidebar-sub">
                {user.role === "teacher"
                  ? `ครู${user.subject || ""}`
                  : `ม.${user.grade_level} ห้อง ${user.classroom}`}
              </div>
            </div>
          </div>

          <button
            className={
              "sidebar-item" + (active === "subjects" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("subjects")}
          >
            🗂 รายวิชา
          </button>

          <button
            className={
              "sidebar-item" +
              (active === "assignments" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("assignments")}
            disabled={!selectedSubject}
          >
            📄 ใบงานในวิชา
          </button>

          {isTeacher && (
            <button
              className={
                "sidebar-item" +
                (active === "dashboard" ? " sidebar-item-active" : "")
              }
              onClick={() => setActive("dashboard")}
            >
              📊 สรุปใบงาน (ครู)
            </button>
          )}

          <button
            className={
              "sidebar-item" + (active === "chat" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("chat")}
          >
            💬 ห้องแชท
          </button>

          <button
            className={
              "sidebar-item" +
              (active === "profile" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("profile")}
          >
            👤 โปรไฟล์
          </button>

          <button className="sidebar-item logout-btn" onClick={onLogout}>
            🚪 ออกจากระบบ
          </button>
        </aside>

        <main className="main-panel">
          {active === "subjects" && (
            <Subjects user={user} onSelect={selectSubject} />
          )}

          {active === "assignments" && selectedSubject && (
            <SubjectAssignments user={user} subject={selectedSubject} />
          )}

          {active === "dashboard" && isTeacher && (
            <TeacherDashboard user={user} />
          )}

          {active === "chat" && <ChatPage user={user} />}

          {active === "profile" && (
            <Profile
              user={user}
              setUser={(u) => {
                setUser(u);
                localStorage.setItem("tupp_user", JSON.stringify(u));
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
