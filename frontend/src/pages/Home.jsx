// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import api from "../api.js";
import socket from "../socket.js";

import SubjectsNew from "./SubjectsNew.jsx";
import SubjectPage from "./SubjectPage.jsx";
import AssignmentDetail from "./AssignmentDetail.jsx";

import StudentDashboard from "./StudentDashboard.jsx";
import AssignmentsCalendar from "./AssignmentsCalendar.jsx";

import TeacherDashboard from "./TeacherDashboard.jsx";
import ChatPage from "./Chat.jsx";
import Profile from "./Profile.jsx";
import SubjectAnnouncements from "./SubjectAnnouncements.jsx";

import {
  requestFCMToken,
  listenForegroundMessage
} from "../firebase.js";

export default function Home({ user, setUser, onLogout }) {
  const [active, setActive] = useState("studentDashboard");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [notif, setNotif] = useState(null);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState({});

  const isTeacher = user.role === "teacher";

  // -------------------------------
  // FCM token registration
  // -------------------------------
  useEffect(() => {
    async function initFCM() {
      if (!user?.id) return;

      try {
        const token = await requestFCMToken();
        if (token) {
          await api.post("/save-fcm-token", {
            user_id: user.id,
            token
          });
        }
      } catch (err) {
        console.error("FCM token error:", err);
      }
    }
    initFCM();
  }, [user]);

  // Foreground push message
  useEffect(() => {
    listenForegroundMessage((payload) => {
      if (!payload?.notification?.body) return;
      setNotif(payload.notification.body);
      setTimeout(() => setNotif(null), 3000);
    });
  }, []);

  // -------------------------------
  // Realtime announcement popup (socket.io)
  // -------------------------------
  useEffect(() => {
    const handler = (a) => {
      if (!a?.subject_id) return;

      setNotif(`📢 ประกาศใหม่: ${a.content}`);
      setUnreadAnnouncements((prev) => ({
        ...prev,
        [a.subject_id]: true
      }));

      setTimeout(() => setNotif(null), 3000);
    };

    socket.on("announcement:new", handler);
    return () => socket.off("announcement:new", handler);
  }, []);

  // -------------------------------
  // Navigation handlers
  // -------------------------------
  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setActive("subjectDetail");
  };

  const handleOpenAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setActive("assignmentDetail");
  };

  const handleSubjectChat = () => {
    setActive("chat");
  };

  // -------------------------------
  // MAIN UI
  // -------------------------------
  return (
    <div className="app-shell">
      <div className="layout-main">

        {/* 🔔 Popup notification */}
        {notif && <div className="notif-popup">{notif}</div>}

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-circle">T</div>
            <div>
              <div className="sidebar-title">TUPP CLASSROOM</div>
              <div className="sidebar-sub">
                {isTeacher
                  ? `ครู${user.subject || ""}`
                  : `ม.${user.grade_level} ห้อง ${user.classroom}`}
              </div>
            </div>
          </div>

          {/* Student Dashboard */}
          {!isTeacher && (
            <button
              className={
                "sidebar-item" +
                (active === "studentDashboard" ? " sidebar-item-active" : "")
              }
              onClick={() => setActive("studentDashboard")}
            >
              🏠 Dashboard นักเรียน
            </button>
          )}

          {/* Teacher Dashboard */}
          {isTeacher && (
            <button
              className={
                "sidebar-item" +
                (active === "teacherDashboard" ? " sidebar-item-active" : "")
              }
              onClick={() => setActive("teacherDashboard")}
            >
              📊 สรุปใบงาน (ครู)
            </button>
          )}

          {/* Subjects */}
          <button
            className={
              "sidebar-item" +
              (active === "subjects" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("subjects")}
          >
            🗂 รายวิชา
          </button>

          {/* Subject detail */}
          <button
            disabled={!selectedSubject}
            className={
              "sidebar-item" +
              (active === "subjectDetail" ? " sidebar-item-active" : "")
            }
            onClick={() => selectedSubject && setActive("subjectDetail")}
          >
            📘 รายละเอียดวิชา
          </button>

          {/* Announcements */}
          <button
            disabled={!selectedSubject}
            className={
              "sidebar-item" +
              (active === "announce" ? " sidebar-item-active" : "")
            }
            onClick={() => {
              if (!selectedSubject) return;
              setActive("announce");
              setUnreadAnnouncements((prev) => ({
                ...prev,
                [selectedSubject.id]: false
              }));
            }}
          >
            📢 ประกาศวิชา
            {selectedSubject &&
              unreadAnnouncements[selectedSubject.id] && (
                <span className="badge-dot" />
              )}
          </button>

          {/* Calendar (student only) */}
          {!isTeacher && (
            <button
              className={
                "sidebar-item" +
                (active === "calendar" ? " sidebar-item-active" : "")
              }
              onClick={() => setActive("calendar")}
            >
              📆 ปฏิทินงาน
            </button>
          )}

          {/* Chat */}
          <button
            className={
              "sidebar-item" +
              (active === "chat" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("chat")}
          >
            💬 ห้องแชท
          </button>

          {/* Profile */}
          <button
            className={
              "sidebar-item" +
              (active === "profile" ? " sidebar-item-active" : "")
            }
            onClick={() => setActive("profile")}
          >
            👤 โปรไฟล์
          </button>

          {/* Logout */}
          <button className="sidebar-item logout-btn" onClick={onLogout}>
            🚪 ออกจากระบบ
          </button>
        </aside>

        {/* MAIN PANEL VIEW */}
        <main className="main-panel">
          {!isTeacher && active === "studentDashboard" && (
            <StudentDashboard user={user} onOpenAssignment={handleOpenAssignment} />
          )}

          {isTeacher && active === "teacherDashboard" && (
            <TeacherDashboard user={user} />
          )}

          {active === "subjects" && (
            <SubjectsNew user={user} onSelect={handleSelectSubject} />
          )}

          {active === "subjectDetail" && selectedSubject && (
            <SubjectPage
              subject={selectedSubject}
              user={user}
              onBack={() => setActive("subjects")}
              onOpenAssignment={handleOpenAssignment}
              onOpenChat={handleSubjectChat}
            />
          )}

          {active === "assignmentDetail" && selectedAssignment && (
            <AssignmentDetail
              assignment={selectedAssignment}
              user={user}
              onBack={() => setActive("subjectDetail")}
            />
          )}

          {active === "announce" && selectedSubject && (
            <SubjectAnnouncements subject={selectedSubject} user={user} />
          )}

          {!isTeacher && active === "calendar" && (
            <AssignmentsCalendar
              user={user}
              onOpenAssignment={handleOpenAssignment}
            />
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
