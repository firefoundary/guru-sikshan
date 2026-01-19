// src/components/StatCard.jsx
import React from "react";

const StatCard = ({ title, value }) => {
  return (
    <div style={{
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "15px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
      flex: "1",
      minWidth: "200px"
    }}>
      <p style={{ color: "#666", margin: "0 0 10px 0", fontSize: "0.9rem" }}>{title}</p>
      <h3 style={{ margin: "0", fontSize: "1.8rem", color: "#000" }}>{value}</h3>
    </div>
  );
};

export default StatCard;