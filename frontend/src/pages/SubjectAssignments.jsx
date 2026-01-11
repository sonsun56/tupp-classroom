import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import socket from "../socket";

/**
 * Teacher Super Dashboard for a subject:
 * 1) Highlight missing submissions (red row)
 * 2) Stats (submitted %, graded %, avg score)
 * 3) Review files + inline feedback + grading
 * 4) Responsive layout (CSS below)
 */
export default function SubjectAssignments({ user, subject }) {
  const isTeacher = user?.role === "teacher";

  // ===== Guards =====
  if (!isTeacher) {
    return (
      <div className="tcard">
        <h3>⛔ ไม่มีสิทธิ์เข้าถึง</h3>
        <p className="muted">หน้านี้สำหรับครูเท่านั้น</p>
      </div>
    );
  }
  if (!subject) return <div className="muted">ไม่พบรายวิชา</div>;

  // ===== State =====
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);

  const [students, setStudents] = useState([]); // roster (filtered)
  const [submissions, setSubmissions] = useState([]); // only who submitted

  // Create assignment form
  const [showCreate, setShowCreate] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aDeadline, setADeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Row selection (review panel)
  const [selectedRow, setSelectedRow] = useState(null); // { student, submission|null }
  const [gradeDraft, setGradeDraft] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  // ===== Loaders =====
  const loadAssignments = async () => {
    const res = await api.get(`/subjects/${subject.id}/assignments`);
    const list = res.data || [];
    setAssignments(list);

    // auto-select first assignment if none selected
    if (!selected && list.length) setSelected(list[0]);
  };

  const loadStudentsRoster = async () => {
    // Backend has /users?role=student; we filter client-side based on subject visibility
    const res = await api.get("/users", { params: { role: "student" } });
    const allStudents = res.data || [];
    const roster = filterStudentsBySubject(allStudents, subject);
    setStudents(roster);
  };

  const loadSubmissions = async (assignmentId) => {
    const res = await api.get(`/submissions/${assignmentId}`);
    setSubmissions(res.data || []);
  };

  // ===== Initial load =====
  useEffect(() => {
    loadAssignments();
    loadStudentsRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id]);

  // ===== When assignment selected =====
  useEffect(() => {
    if (!selected?.id) return;
    loadSubmissions(selected.id);
    setSelectedRow(null);
    setGradeDraft("");
    setFeedbackDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ===== Realtime =====
  useEffect(() => {
    const onAssignmentsUpdated = (p) => {
      if (p?.subject_id === subject.id) loadAssignments();
    };
    const onSubmissionsUpdated = (p) => {
      // backend emits assignment_id
      if (p?.assignment_id && selected?.id && String(p.assignment_id) === String(selected.id)) {
        loadSubmissions(selected.id);
      }
    };

    socket.on("assignments:updated", onAssignmentsUpdated);
    socket.on("submissions:updated", onSubmissionsUpdated);
    return () => {
      socket.off("assignments:updated", onAssignmentsUpdated);
      socket.off("submissions:updated", onSubmissionsUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, selected?.id]);

  // ===== Merge: roster + submissions =====
  const mergedRows = useMemo(() => {
    const subByStudent = new Map();
    submissions.forEach((s) => subByStudent.set(String(s.student_id), s));

    return students
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((stu) => {
        const sub = subByStudent.get(String(stu.id)) || null;
        const status = !sub
          ? "missing"
          : sub.grade != null && String(sub.grade).trim() !== ""
          ? "graded"
          : "submitted";
        return { student: stu, submission: sub, status };
      });
  }, [students, submissions]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const total = mergedRows.length || 0;
    const submittedCount = mergedRows.filter((r) => r.status !== "missing").length;
    const missingCount = total - submittedCount;
    const gradedCount = mergedRows.filter((r) => r.status === "graded").length;

    // average score (only numeric grades)
    const numericGrades = mergedRows
      .filter((r) => r.status === "graded" && r.submission?.grade != null)
      .map((r) => Number(r.submission.grade))
      .filter((n) => Number.isFinite(n));
    const avg =
      numericGrades.length > 0
        ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2)
        : "-";

    const submittedPct = total ? Math.round((submittedCount / total) * 100) : 0;
    const gradedPct = total ? Math.round((gradedCount / total) * 100) : 0;

    return { total, submittedCount, missingCount, gradedCount, submittedPct, gradedPct, avg };
  }, [mergedRows]);

  // ===== Actions =====
  const createAssignment = async () => {
    if (!aTitle.trim()) return alert("กรุณากรอกชื่อใบงาน");
    setSaving(true);
    try {
      // (optional) if you want worksheet upload, switch to FormData + upload.single in backend
      await api.post("/assignments", {
        subject_id: subject.id,
        title: aTitle,
        description: aDesc,
        deadline: aDeadline || null,
        grading_mode: "check",
      });

      setATitle("");
      setADesc("");
      setADeadline("");
      setShowCreate(false);
      await loadAssignments();
    } catch (e) {
      alert(e?.response?.data?.error || "สร้างใบงานไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const openRow = (row) => {
    setSelectedRow(row);
    setGradeDraft(row?.submission?.grade ?? "");
    setFeedbackDraft(row?.submission?.feedback ?? "");
  };

  const saveGrade = async () => {
    if (!selectedRow?.submission?.id) return;
    setSavingGrade(true);
    try {
      await api.post(`/submissions/${selectedRow.submission.id}/grade`, {
        grade: gradeDraft,
        feedback: feedbackDraft,
      });
      await loadSubmissions(selected.id);
      // keep panel open but refresh its data
      const refreshed = mergedRows.find((r) => String(r.student.id) === String(selectedRow.student.id));
      if (refreshed) openRow(refreshed);
    } catch (e) {
      alert(e?.response?.data?.error || "บันทึกคะแนนไม่สำเร็จ");
    } finally {
      setSavingGrade(false);
    }
  };

  const markTab = (status) => {
    if (status === "missing") return { text: "ยังไม่ส่ง", cls: "badge red" };
    if (status === "submitted") return { text: "รอตรวจ", cls: "badge orange" };
    return { text: "ตรวจแล้ว", cls: "badge green" };
  };

  return (
    <div className="teacher-shell">
      {/* ===== HEADER ===== */}
      <div className="teacher-header">
        <div>
          <div className="kicker">TEACHER CENTER</div>
          <h1 className="teacher-title">{subject.name}</h1>
          <div className="muted">
            คุมใบงาน · ตรวจงาน · ให้คะแนน — ในหน้าเดียว
          </div>
        </div>

        <div className="header-actions">
          <button className="btn" onClick={() => loadAssignments()}>
            ↻ รีเฟรช
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            ➕ สร้างใบงาน
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-grid">
        <StatCard label="นักเรียนทั้งหมด" value={stats.total} sub="รายชื่อที่อยู่ในรายวิชานี้" />
        <StatCard
          label="ส่งแล้ว"
          value={`${stats.submittedCount} (${stats.submittedPct}%)`}
          sub={`ยังไม่ส่ง ${stats.missingCount}`}
        />
        <StatCard
          label="ตรวจแล้ว"
          value={`${stats.gradedCount} (${stats.gradedPct}%)`}
          sub={`ค่าเฉลี่ยคะแนน ${stats.avg}`}
        />
        <StatCard
          label="Realtime"
          value="ON"
          sub="อัปเดตอัตโนมัติเมื่อมีการส่ง/ให้คะแนน"
        />
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="teacher-grid teacher-grid-wide">
        {/* LEFT: assignments */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">📄 ใบงาน</div>
            <div className="muted">{assignments.length} รายการ</div>
          </div>

          <div className="assignment-list">
            {assignments.map((a) => (
              <button
                key={a.id}
                className={"assignment-item " + (selected?.id === a.id ? "active" : "")}
                onClick={() => setSelected(a)}
              >
                <div className="row-between">
                  <div className="strong">{a.title}</div>
                  <div className="tiny muted">{a.deadline || "—"}</div>
                </div>
                <div className="tiny muted line-clamp-2">{a.description || "ไม่มีคำอธิบาย"}</div>
              </button>
            ))}

            {assignments.length === 0 && (
              <div className="muted" style={{ padding: 12 }}>
                ยังไม่มีใบงานในวิชานี้
              </div>
            )}
          </div>
        </div>

        {/* CENTER: roster + submissions */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">👩‍🎓 นักเรียน</div>
              <div className="muted tiny">
                คลิกแถวเพื่อดูไฟล์/ให้คะแนนแบบเร็ว
              </div>
            </div>

            <div className="pill-group">
              <span className="pill">
                🔴 {stats.missingCount} ไม่ส่ง
              </span>
              <span className="pill">
                🟠 {stats.submittedCount - stats.gradedCount} รอตรวจ
              </span>
              <span className="pill">
                🟢 {stats.gradedCount} ตรวจแล้ว
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="grade-table">
              <thead>
                <tr>
                  <th>นักเรียน</th>
                  <th>ไฟล์</th>
                  <th>คะแนน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((row) => {
                  const { text, cls } = markTab(row.status);
                  const isActive = selectedRow?.student?.id === row.student.id;

                  return (
                    <tr
                      key={row.student.id}
                      className={[
                        row.status === "missing" ? "row-missing" : "",
                        isActive ? "row-active" : "",
                      ].join(" ")}
                      onClick={() => openRow(row)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="strong">{row.student.name}</div>
                        <div className="tiny muted">
                          ม.{row.student.grade_level} ห้อง {row.student.classroom}
                        </div>
                      </td>

                      <td>
                        {row.submission?.files?.length ? (
                          <div className="file-icons">
                            {row.submission.files.slice(0, 4).map((f, i) => (
                              <a
                                key={i}
                                className="file-ico"
                                href={f}
                                target="_blank"
                                rel="noreferrer"
                                title={`ไฟล์ ${i + 1}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                📎
                              </a>
                            ))}
                            {row.submission.files.length > 4 && (
                              <span className="tiny muted">+{row.submission.files.length - 4}</span>
                            )}
                          </div>
                        ) : (
                          <span className="tiny muted">—</span>
                        )}
                      </td>

                      <td>
                        <span className="tiny">
                          {row.submission?.grade ?? "—"}
                        </span>
                      </td>

                      <td>
                        <span className={cls}>{text}</span>
                      </td>
                    </tr>
                  );
                })}

                {mergedRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: 12 }}>
                      ไม่พบนักเรียนในรายวิชานี้ (ตรวจ visibility/grade/classroom)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: review panel */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">🧾 ตรวจงาน</div>
            <div className="muted tiny">ไฟล์ · คอมเมนต์ · คะแนน</div>
          </div>

          {!selected && (
            <div className="muted" style={{ padding: 12 }}>
              เลือกใบงานก่อน
            </div>
          )}

          {selected && !selectedRow && (
            <div className="muted" style={{ padding: 12 }}>
              เลือกนักเรียนจากตารางเพื่อเริ่มตรวจ
            </div>
          )}

          {selected && selectedRow && (
            <div className="review">
              <div className="review-head">
                <div>
                  <div className="strong">{selectedRow.student.name}</div>
                  <div className="tiny muted">
                    ม.{selectedRow.student.grade_level} ห้อง {selectedRow.student.classroom}
                  </div>
                </div>

                {(() => {
                  const { text, cls } = markTab(selectedRow.status);
                  return <span className={cls}>{text}</span>;
                })()}
              </div>

              {/* Files */}
              <div className="review-block">
                <div className="label">ไฟล์ที่ส่ง</div>
                {selectedRow.submission?.files?.length ? (
                  <div className="file-list">
                    {selectedRow.submission.files.map((f, i) => (
                      <a key={i} className="file-chip" href={f} target="_blank" rel="noreferrer">
                        📎 ไฟล์ {i + 1}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="muted tiny">ยังไม่มีไฟล์ (นักเรียนยังไม่ส่ง)</div>
                )}
              </div>

              {/* Grade + Feedback */}
              <div className="review-block">
                <div className="label">คะแนน</div>
                <input
                  className="input"
                  placeholder="เช่น 10 หรือ 85"
                  value={gradeDraft}
                  onChange={(e) => setGradeDraft(e.target.value)}
                  disabled={!selectedRow.submission}
                />
                <div className="label" style={{ marginTop: 10 }}>ความคิดเห็น/คอมเมนต์</div>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="พิมพ์ feedback ให้เด็กตรงนี้..."
                  value={feedbackDraft}
                  onChange={(e) => setFeedbackDraft(e.target.value)}
                  disabled={!selectedRow.submission}
                />
                <button
                  className="btn-primary"
                  onClick={saveGrade}
                  disabled={!selectedRow.submission || savingGrade}
                  style={{ marginTop: 10 }}
                >
                  {savingGrade ? "กำลังบันทึก..." : "บันทึกคะแนน & คอมเมนต์"}
                </button>
              </div>

              {/* Quick actions */}
              <div className="review-block">
                <div className="label">เครื่องมือเร็ว</div>
                <div className="quick-actions">
                  <button className="btn" onClick={() => loadSubmissions(selected.id)}>
                    ↻ รีโหลดรายชื่อ
                  </button>
                  <button className="btn" onClick={() => setSelectedRow(null)}>
                    ✖ ปิดแผงตรวจ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== CREATE MODAL ===== */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => !saving && setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <div className="strong">➕ สร้างใบงานใหม่</div>
              <button className="btn" onClick={() => !saving && setShowCreate(false)}>
                ✖
              </button>
            </div>

            <div className="muted tiny" style={{ marginBottom: 10 }}>
              สร้างแล้วอัปเดต realtime ทุกหน้าที่เปิดอยู่
            </div>

            <input
              className="input"
              placeholder="ชื่อใบงาน"
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
            />
            <textarea
              className="input"
              rows={4}
              placeholder="คำอธิบาย"
              value={aDesc}
              onChange={(e) => setADesc(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={aDeadline}
              onChange={(e) => setADeadline(e.target.value)}
            />

            <button className="btn-primary" onClick={createAssignment} disabled={saving}>
              {saving ? "กำลังสร้าง..." : "สร้างใบงาน"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Helpers =====
function filterStudentsBySubject(allStudents, subject) {
  // subject schema: visibility_mode: all|grade|classroom, target_grade_level, target_classroom
  if (!subject?.visibility_mode || subject.visibility_mode === "all") return allStudents;

  const g = Number(subject.target_grade_level);
  if (subject.visibility_mode === "grade") {
    return allStudents.filter((s) => Number(s.grade_level) === g);
  }

  if (subject.visibility_mode === "classroom") {
    const c = Number(subject.target_classroom);
    return allStudents.filter(
      (s) => Number(s.grade_level) === g && Number(s.classroom) === c
    );
  }

  return allStudents;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="tiny muted">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="tiny muted">{sub}</div>
    </div>
  );
}
