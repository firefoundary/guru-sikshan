// Dashboard.jsx
import DashboardLayout from "../layout/DashboardLayout";
import StatCard from "../components/StatCard";
import React from "react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#ccbe87" }}>
          Dashboard
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <StatCard title="clusters" value="1,245" />
          <StatCard title="Teachers" value="84" />
          <StatCard title="Courses" value="32" />
        </div>
      </div>
    </DashboardLayout>
  );
}
