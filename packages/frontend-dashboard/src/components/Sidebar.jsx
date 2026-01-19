// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Teachers", path: "/teachers" },
    { name: "Feedback", path: "/feedback" },
    { name : "Upload Module", path : "/upload-modules"},
  ];

  return (
    <div style={{ width: "250px", backgroundColor: "#003d82", height: "100vh", color: "white", padding: "20px" }}>
      <h2 style={{ marginBottom: "5px", fontSize: "1.5rem" }}>Guru Sikshan</h2>
      <h4 style={{ marginBottom: "80px", fontSize: "0.7rem" }}>Teacher Trainin Platform</h4>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: "none",
              color: "white",
              padding: "12px 15px",
              borderRadius: "8px",
              backgroundColor: location.pathname === item.path ? "rgba(255,255,255,0.2)" : "transparent",
              transition: "0.3s"
            }}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;