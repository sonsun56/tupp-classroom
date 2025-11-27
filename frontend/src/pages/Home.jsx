// src/pages/Home.jsx
import React, { useState } from "react";

import SubjectsNew from "./SubjectsNew.jsx";
import SubjectPage from "./SubjectPage.jsx";
import AssignmentDetail from "./AssignmentDetail.jsx";

import StudentDashboard from "./StudentDashboard.jsx";
import AssignmentsCalendar from "./AssignmentsCalendar.jsx";

import TeacherDashboard from "./TeacherDashboard.jsx";
import ChatPage from "./Chat.jsx";
import Profile from "./Profile.jsx";

export default function Home({ user, setUser, onLogout }) {
  const [active, setActive] = useState("studentDashboard"); // เริ่มที่ dashboard นักเรียน

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const isTeacher = user.role === "teacher";

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

  return (
    <div className="app-shell">
      <div className="layout-main">
        {/* SIDEBAR */}
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

          {/* Dashboard นักเรียน (เฉพาะ student) */}
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

          {/* Dashboard ครู */}
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

          {/* รายละเอียดวิชา */}
          <button
            disabled={!selectedSubject}
            className={
              "sidebar-item" +
              (active === "subjectDetail" ? " sidebar-item-active" : "")
            }
            onClick={() =>
              selectedSubject && setActive("subjectDetail")
            }
          >
            📘 รายละเอียดวิชา
          </button>

          {/* ปฏิทินงาน */}
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

        {/* MAIN */}
        <main className="main-panel">
          {/* STUDENT DASHBOARD */}
          {!isTeacher && active === "studentDashboard" && (
            <StudentDashboard
              user={user}
              onOpenAssignment={handleOpenAssignment}
            />
          )}

          {/* TEACHER DASHBOARD */}
          {isTeacher && active === "teacherDashboard" && (
            <TeacherDashboard user={user} />
          )}

          {/* SUBJECTS LIST */}
          {active === "subjects" && (
            <SubjectsNew user={user} onSelect={handleSelectSubject} />
          )}

          {/* SUBJECT PAGE (detail + assignments + sort) */}
          {active === "subjectDetail" && selectedSubject && (
            <SubjectPage
              subject={selectedSubject}
              user={user}
              onBack={() => setActive("subjects")}
              onOpenAssignment={handleOpenAssignment}
              onOpenChat={handleSubjectChat}
            />
          )}

          {/* ASSIGNMENT DETAIL */}
          {active === "assignmentDetail" && selectedAssignment && (
            <AssignmentDetail
              assignment={selectedAssignment}
              user={user}
              onBack={() => setActive("subjectDetail")}
            />
          )}

          {/* CALENDAR VIEW */}
          {!isTeacher && active === "calendar" && (
            <AssignmentsCalendar
              user={user}
              onOpenAssignment={handleOpenAssignment}
            />
          )}

          {/* CHAT */}
          {active === "chat" && <ChatPage user={user} />}

          {/* PROFILE */}
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
