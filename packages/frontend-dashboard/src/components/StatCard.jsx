import React from "react";

export default function StatCard({ title, value, icon, accent = "#3b82f6" }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1f2933, #111827)",
        padding: "20px",
        borderRadius: "14px",
        color: "white",
        boxShadow: "0 10px 25px rgba(79, 72, 72, 0.35)",
        borderLeft: `4px solid ${accent}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 16px 30px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 10px 25px rgba(0,0,0,0.35)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p style={{ opacity: 0.7, fontSize: "14px" }}>{title}</p>
        {icon && (
          <span style={{ fontSize: "20px", opacity: 0.8 }}>{icon}</span>
        )}
      </div>

      <h2 style={{ fontSize: "28px", marginTop: "10px", fontWeight: "bold" }}>
        {value}
      </h2>
    </div>
  );
}
