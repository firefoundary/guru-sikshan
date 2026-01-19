// src/pages/Teachers.jsx
import React from "react";
import DashboardLayout from "../layout/DashboardLayout";

const Teachers = () => {
  // Mock data for teachers
  const teachers = [
    { id: "T001", name: "Ramesh Kumar", cluster: "Gandhinagar-1", status: "Active" },
    { id: "T002", name: "Sita Patel", cluster: "Gandhinagar-2", status: "On Leave" },
    { id: "T003", name: "Amit Shah", cluster: "Gandhinagar-1", status: "Active" },
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#000" }}>Teachers Directory</h1>
        <p style={{ color: "#666" }}>Manage and view teacher profiles across clusters</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {teachers.map((teacher) => (
          <div key={teacher.id} style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            borderLeft: `5px solid ${teacher.status === 'Active' ? '#28a745' : '#ffc107'}`
          }}>
            <h3 style={{ margin: "0 0 5px 0" }}>{teacher.name}</h3>
            <p style={{ margin: "2px 0", color: "#666", fontSize: "0.9rem" }}>ID: {teacher.id}</p>
            <p style={{ margin: "2px 0", color: "#666", fontSize: "0.9rem" }}>Cluster: {teacher.cluster}</p>
            <div style={{ 
              marginTop: "10px", 
              display: "inline-block", 
              padding: "4px 10px", 
              borderRadius: "20px", 
              fontSize: "0.8rem",
              backgroundColor: teacher.status === 'Active' ? "#e8f5e9" : "#fff3e0",
              color: teacher.status === 'Active' ? "#2e7d32" : "#ef6c00"
            }}>
              {teacher.status}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Teachers;