// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  // ลองดึง user จาก localStorage เวลา refresh หน้า
  useEffect(() => {
    const saved = localStorage.getItem("tupp_user");
    if (saved) {
      setUser(JSON.parse(saved));
      setPage("home");
    }
  }, []);

  const handleLoggedIn = (u) => {
    setUser(u);
    localStorage.setItem("tupp_user", JSON.stringify(u));
    setPage("home");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("tupp_user");
    setPage("login");
  };

  if (!user) {
    if (page === "register") {
      return (
        <Register
          onSwitchToLogin={() => setPage("login")}
          onRegistered={handleLoggedIn}
        />
      );
    }
    return (
      <Login
        onSwitchToRegister={() => setPage("register")}
        onLoggedIn={handleLoggedIn}
      />
    );
  }

  return <Home user={user} setUser={setUser} onLogout={handleLogout} />;
}
