export default function AuthGuard({ user, allow = [], children }) {
  if (!user) {
    return (
      <div className="card">
        <h3>กรุณาเข้าสู่ระบบ</h3>
      </div>
    );
  }

  if (allow.length && !allow.includes(user.role)) {
    return (
      <div className="card">
        <h3>⛔ ไม่มีสิทธิ์เข้าถึง</h3>
        <p className="muted">หน้านี้ไม่เปิดให้บทบาทนี้</p>
      </div>
    );
  }

  return children;
}
