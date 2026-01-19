// src/pages/Dashboard.jsx
import React from "react";
import DashboardLayout from "../layout/DashboardLayout";
import StatCard from "../components/StatCard";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0  , color : 'black'}}>DIET Authority Dashboard</h1>
        
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <StatCard title="Active Clusters" value="12" />
        <StatCard title="Classroom Issues" value="45" />
        <StatCard title="Modules Updated" value="38" />
        
      </div>
      
      {/* You can add your IssueTable.jsx below the cards here */}
    </DashboardLayout>
  );
};

export default Dashboard;