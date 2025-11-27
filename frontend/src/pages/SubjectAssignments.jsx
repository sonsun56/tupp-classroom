// frontend/src/pages/SubjectAssignments.jsx
import React, { useEffect, useState } from "react";
import api from "../api.js";

export default function SubjectAssignments({ user, subject }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // ครูสร้างงาน
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [gradingMode, setGradingMode] = useState("check");
  const [maxScore, setMaxScore] = useState(100);
  const [requireScore, setRequireScore] = useState(false);
  const [worksheetFile, setWorksheetFile] = useState(null);

  // นักเรียนส่งงาน
  const [files, setFiles] = useState([]);
  const [submitMsg, setSubmitMsg] = useState("");

  const isTeacher = user.role === "teacher";

  const loadAssignments = async () => {
    if (!subject) return;
    setLoading(true);
    try {
      const res = await api.get(`/subjects/${subject.id}/assignments`);
      setAssignments(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignment) => {
    try {
      const res = await api.get(`/submissions/${assignment.id}`);
      setSubmissions(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (subject?.id) {
      setSelectedAssignment(null);
      setSubmissions([]);
      loadAssignments();
    }
  }, [subject?.id]);

  const openAssignment = (a) => {
    setSelectedAssignment(a);
    setSubmissions([]);
    loadSubmissions(a);
  };

  const createAssignment = async () => {
    if (!subject) {
      alert("กรุณาเลือกวิชาก่อน");
      return;
    }
    if (!title.trim()) {
      alert("กรุณากรอกชื่อใบงาน");
      return;
    }

    const form = new FormData();
    form.append("subject_id", subject.id);
    form.append("title", title.trim());
    form.append("description", desc.trim());
    if (deadline) form.append("deadline", deadline);
    form.append("grading_mode", gradingMode);
    if (gradingMode === "percent") {
      form.append("max_score", maxScore || 100);
      form.append("require_score", requireScore ? "1" : "0");
    }
    if (worksheetFile) {
      form.append("worksheet", worksheetFile);
    }

    try {
      const res = await api.post("/assignments", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAssignments((prev) => [res.data, ...prev]);
      setTitle("");
      setDesc("");
      setDeadline("");
      setWorksheetFile(null);
      alert("สร้างใบงานสำเร็จ");
    } catch (e) {
      alert(e.response?.data?.error || "สร้างใบงานไม่สำเร็จ");
    }
  };

  const mySubmission = submissions.find((s) => s.student_id === user.id);

  const submitAssignment = async () => {
    if (!selectedAssignment) return;
    if (!files.length) {
      alert("กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์");
      return;
    }
    const form = new FormData();
    form.append("student_id", user.id);
    for (const f of files) {
      form.append("files", f);
    }
    try {
      const res = await api.post(
        `/submissions/${selectedAssignment.id}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSubmitMsg(res.data.message || "ส่งงานสำเร็จ");
      loadSubmissions(selectedAssignment);
    } catch (e) {
      alert(e.response?.data?.error || "ส่งงานไม่สำเร็จ");
    }
  };

  const updateGrade = async (subId, grade, feedback) => {
    try {
      await api.post(`/submissions/${subId}/grade`, {
        grade,
        feedback,
      });
      loadSubmissions(selectedAssignment);
    } catch (e) {
      alert(e.response?.data?.error || "บันทึกคะแนนไม่สำเร็จ");
    }
  };

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            ใบงานในวิชา {subject?.name || "-"}
          </h2>
          <p className="panel-subtitle">
            เลือกใบงานด้านซ้ายเพื่อดูรายละเอียดและการส่งงาน
          </p>
        </div>
      </div>

      <div className="two-cols">
        <div className="col-left">
          {isTeacher && (
            <div className="card">
              <h3 className="card-title">สร้างใบงานใหม่</h3>
              <div className="card-body">
                <input
                  className="input"
                  placeholder="ชื่อใบงาน"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="input"
                  placeholder="คำอธิบาย / เงื่อนไข"
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
                <label className="text-sm">
                  กำหนดส่ง
                  <input
                    className="input"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </label>

                <label className="text-sm">
                  ไฟล์ใบงาน (optional)
                  <input
                    className="input"
                    type="file"
                    onChange={(e) => setWorksheetFile(e.target.files[0])}
                  />
                </label>

                <div>
                  <label className="text-sm">โหมดการให้คะแนน</label>
                  <select
                    className="input"
                    value={gradingMode}
                    onChange={(e) => setGradingMode(e.target.value)}
                  >
                    <option value="check">ตรวจเช็ค (ผ่าน/ไม่ผ่าน)</option>
                    <option value="score10">คะแนนเต็ม 10</option>
                    <option value="percent">เปอร์เซ็นต์</option>
                  </select>
                </div>

                {gradingMode === "percent" && (
                  <div className="grid-2">
                    <div>
                      <label className="text-sm">คะแนนเต็ม</label>
                      <input
                        className="input"
                        type="number"
                        value={maxScore}
                        onChange={(e) =>
                          setMaxScore(Number(e.target.value) || 100)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm">ต้องมีคะแนน</label>
                      <div>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={requireScore}
                            onChange={(e) =>
                              setRequireScore(e.target.checked)
                            }
                          />
                          <span>ต้องระบุคะแนนทุกครั้ง</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <button className="btn-primary" onClick={createAssignment}>
                  ➕ สร้างใบงาน
                </button>
              </div>
            </div>
          )}

          <h3 className="section-title">รายการใบงาน</h3>
          {loading && <div className="text-sm">กำลังโหลดใบงาน...</div>}
          {!loading && assignments.length === 0 && (
            <div className="text-sm">ยังไม่มีใบงานในวิชานี้</div>
          )}
          <div className="card-list">
            {assignments.map((a) => (
              <button
                key={a.id}
                className={
                  "card assignment-card" +
                  (selectedAssignment?.id === a.id ? " card-selected" : "")
                }
                onClick={() => openAssignment(a)}
              >
                <div className="card-title-row">
                  <div className="card-title">{a.title}</div>
                  {a.deadline && (
                    <span className="badge badge-soft">
                      กำหนดส่ง: {a.deadline}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  โหมดคะแนน: {a.grading_mode} • ID #{a.id}
                </div>
                {a.worksheet_url && (
                  <div className="text-xs">
                    📎{" "}
                    <a href={a.worksheet_url} target="_blank" rel="noreferrer">
                      ดาวน์โหลดใบงาน
                    </a>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="col-right">
          {!selectedAssignment && (
            <div className="text-sm">เลือกใบงานจากด้านซ้ายก่อน</div>
          )}

          {selectedAssignment && (
            <div className="card">
              <h3 className="card-title">{selectedAssignment.title}</h3>
              <p className="text-sm">
                {selectedAssignment.description || "ไม่มีคำอธิบายเพิ่มเติม"}
              </p>

              {/* นักเรียนส่งงาน */}
              {user.role === "student" && (
                <div className="card-subsection">
                  <h4 className="card-subtitle">ส่งงานของฉัน</h4>
                  <input
                    className="input"
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginTop: 8 }}
                    onClick={submitAssignment}
                  >
                    📤 ส่งงาน
                  </button>
                  {submitMsg && (
                    <div className="text-sm" style={{ color: "#16a34a" }}>
                      {submitMsg}
                    </div>
                  )}
                  {mySubmission && (
                    <div className="text-sm" style={{ marginTop: 8 }}>
                      สถานะ: ส่งแล้ว • คะแนน{" "}
                      {mySubmission.grade ?? "ยังไม่ตรวจ"}
                    </div>
                  )}
                </div>
              )}

              {/* รายชื่อผู้ส่งงาน */}
<div className="card-subsection">
  <h4 className="card-subtitle">
    {isTeacher
      ? `รายชื่อนักเรียนที่ส่งงาน (${submissions.length})`
      : "งานที่ฉันส่ง"}
  </h4>

  {/* นักเรียน: แสดงเฉพาะงานของตัวเอง */}
  {!isTeacher && (
    <div>
      {mySubmission ? (
        <SubmissionRow
          submission={mySubmission}
          isTeacher={false}
          onSave={() => {}}
        />
      ) : (
        <div className="text-sm">ยังไม่ได้ส่งงาน</div>
      )}
    </div>
  )}

  {/* ครู: แสดงรายชื่อทั้งหมด */}
  {isTeacher && (
    <div className="submission-list">
      {submissions.length === 0 && (
        <div className="text-sm">ยังไม่มีใครส่งงาน</div>
      )}
      {submissions.map((s) => (
        <SubmissionRow
          key={s.id}
          submission={s}
          isTeacher={true}
          onSave={(grade, feedback) =>
            updateGrade(s.id, grade, feedback)
          }
        />
      ))}
    </div>
  )}
</div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ submission, isTeacher, onSave }) {
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  return (
    <div className="submission-row">
      <div className="submission-main">
        <div className="submission-name">
          {submission.student_name || "ไม่ระบุชื่อ"}
        </div>
        <div className="text-xs">
          ม.{submission.grade_level} ห้อง {submission.classroom} • ID{" "}
          {submission.student_id}
        </div>
        <div className="file-list">
          {submission.files?.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="file-chip"
            >
              ไฟล์ที่ {idx + 1}
            </a>
          ))}
        </div>
      </div>

      <div className="submission-actions">
        {isTeacher ? (
          <>
            <input
              className="input input-xs"
              placeholder="คะแนน"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
            <input
              className="input input-xs"
              placeholder="ความคิดเห็น"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              className="btn-pill"
              onClick={() => onSave(grade, feedback)}
            >
              💾 บันทึก
            </button>
          </>
        ) : (
          <div className="text-xs">
            คะแนน: {submission.grade ?? "ยังไม่ตรวจ"}
            {submission.feedback && ` • ความเห็น: ${submission.feedback}`}
          </div>
        )}
      </div>
    </div>
  );
}
