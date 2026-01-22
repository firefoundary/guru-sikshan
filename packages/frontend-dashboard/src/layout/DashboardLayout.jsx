// src/layout/DashboardLayout.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#ffffff" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <Topbar />
        <main style={{ padding: "30px" }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;