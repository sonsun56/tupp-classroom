import React, { useState } from "react";

import Subjects from "./Subjects.jsx";          // ✅ ใช้ตัวนี้เป็น list รายวิชา
import SubjectsNew from "./SubjectsNew.jsx";    // ครูเท่านั้น
import SubjectPage from "./SubjectPage.jsx";
import AssignmentDetail from "./AssignmentDetail.jsx";

import StudentDashboard from "./StudentDashboard.jsx";
import AssignmentsCalendar from "./AssignmentsCalendar.jsx";

import TeacherDashboard from "./TeacherDashboard.jsx";
import ChatPage from "./Chat.jsx";
import Profile from "./Profile.jsx";
import SubjectAssignments from "./SubjectAssignments.jsx";

export default function Home({ user, setUser, onLogout }) {
  const isTeacher = user.role === "teacher";

  const [active, setActive] = useState(
    isTeacher ? "teacherDashboard" : "studentDashboard"
  );

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // ===== เลือกรายวิชา =====
  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setActive(isTeacher ? "teacherSubject" : "subjectDetail");
  };

  const handleOpenAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setActive("assignmentDetail");
  };

  return (
    <div className="app-shell">
      <div className="layout-main">
        {/* ===== SIDEBAR ===== */}
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

          {/* DASHBOARD */}
          {!isTeacher && (
            <button
              className={`sidebar-item ${
                active === "studentDashboard" ? "sidebar-item-active" : ""
              }`}
              onClick={() => setActive("studentDashboard")}
            >
              🏠 Dashboard นักเรียน
            </button>
          )}

          {isTeacher && (
            <button
              className={`sidebar-item ${
                active === "teacherDashboard" ? "sidebar-item-active" : ""
              }`}
              onClick={() => setActive("teacherDashboard")}
            >
              📊 สรุปใบงาน (ครู)
            </button>
          )}

          {/* SUBJECTS LIST */}
          <button
            className={`sidebar-item ${
              active === "subjects" ? "sidebar-item-active" : ""
            }`}
            onClick={() => setActive("subjects")}
          >
            🗂 รายวิชา
          </button>

          {/* SUBJECT DETAIL */}
          <button
            disabled={!selectedSubject}
            className={`sidebar-item ${
              active === "subjectDetail" || active === "teacherSubject"
                ? "sidebar-item-active"
                : ""
            }`}
            onClick={() =>
              selectedSubject &&
              setActive(isTeacher ? "teacherSubject" : "subjectDetail")
            }
          >
            📘 รายละเอียดวิชา
          </button>

          {/* CREATE SUBJECT (ครูเท่านั้น) */}
          {isTeacher && (
            <button
              className={`sidebar-item ${
                active === "subjectsNew" ? "sidebar-item-active" : ""
              }`}
              onClick={() => setActive("subjectsNew")}
            >
              ➕ สร้างรายวิชา
            </button>
          )}

          {/* CALENDAR */}
          {!isTeacher && (
            <button
              className={`sidebar-item ${
                active === "calendar" ? "sidebar-item-active" : ""
              }`}
              onClick={() => setActive("calendar")}
            >
              📆 ปฏิทินงาน
            </button>
          )}

          {/* CHAT */}
          <button
            className={`sidebar-item ${
              active === "chat" ? "sidebar-item-active" : ""
            }`}
            onClick={() => setActive("chat")}
          >
            💬 ห้องแชท
          </button>

          {/* PROFILE */}
          <button
            className={`sidebar-item ${
              active === "profile" ? "sidebar-item-active" : ""
            }`}
            onClick={() => setActive("profile")}
          >
            👤 โปรไฟล์
          </button>

          <button className="sidebar-item logout-btn" onClick={onLogout}>
            🚪 ออกจากระบบ
          </button>
        </aside>

        {/* ===== MAIN PANEL ===== */}
        <main className="main-panel">
          {/* DASHBOARD */}
          {!isTeacher && active === "studentDashboard" && (
            <StudentDashboard
              user={user}
              onOpenAssignment={handleOpenAssignment}
            />
          )}

          {isTeacher && active === "teacherDashboard" && (
            <TeacherDashboard user={user} />
          )}

          {/* SUBJECT LIST (ทุก role) */}
          {active === "subjects" && (
            <Subjects user={user} onSelect={handleSelectSubject} />
          )}

          {/* STUDENT SUBJECT */}
          {!isTeacher && active === "subjectDetail" && selectedSubject && (
            <SubjectPage
              subject={selectedSubject}
              user={user}
              onBack={() => setActive("subjects")}
              onOpenAssignment={handleOpenAssignment}
              onOpenChat={() => setActive("chat")}
            />
          )}

          {/* TEACHER SUBJECT */}
          {isTeacher && active === "teacherSubject" && selectedSubject && (
            <SubjectAssignments user={user} subject={selectedSubject} />
          )}

          {/* ASSIGNMENT DETAIL */}
          {active === "assignmentDetail" && selectedAssignment && (
            <AssignmentDetail
              assignment={selectedAssignment}
              user={user}
              onBack={() =>
                setActive(isTeacher ? "teacherSubject" : "subjectDetail")
              }
            />
          )}

          {/* CREATE SUBJECT */}
          {isTeacher && active === "subjectsNew" && (
            <SubjectsNew user={user} onBack={() => setActive("subjects")} />
          )}

          {/* CALENDAR */}
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
