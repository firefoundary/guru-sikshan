import React, { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";

const Feedback = () => {
  const [filter, setFilter] = useState("All");

  // Mock data representing feedback from the mobile app
  const teacherFeedbacks = [
    {
      id: 1,
      teacher: "Ramesh Kumar",
      moduleName: "Advanced Fractions",
      topic: "Mathematics",
      category: "Content Quality",
      message: "The module was very helpful, but the local language translation for 'Numerator' was slightly confusing.",
      date: "Jan 18, 2026"
    },
    {
      id: 2,
      teacher: "Sita Patel",
      moduleName: "Force & Motion",
      topic: "Science",
      category: "Technical Issue",
      message: "The AI summary didn't load properly on my mobile app for this specific module.",
      date: "Jan 17, 2026"
    },
    {
      id: 3,
      teacher: "Amit Shah",
      moduleName: "Classroom Ethics",
      topic: "Pedagogy",
      category: "Suggestion",
      message: "I would love to see more video-based content in this module for better engagement.",
      date: "Jan 15, 2026"
    }
  ];

  const filteredData = filter === "All" 
    ? teacherFeedbacks 
    : teacherFeedbacks.filter(item => item.category === filter);

  const styles = {
    filterContainer: {
      backgroundColor: "#fff",
      padding: "15px 25px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      gap: "15px",
      marginBottom: "25px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#fff",
      borderRadius: "15px",
      overflow: "hidden",
      boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
    },
    th: {
      backgroundColor: "#003d82",
      color: "#fff",
      textAlign: "left",
      padding: "15px",
      fontSize: "0.9rem"
    },
    td: {
      padding: "15px",
      borderBottom: "1px solid #eee",
      fontSize: "0.85rem",
      color: "#444"
    },
    badge: (category) => ({
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "0.75rem",
      fontWeight: "bold",
      backgroundColor: category === "Technical Issue" ? "#ffebee" : "#e3f2fd",
      color: category === "Technical Issue" ? "#c62828" : "#1565c0"
    })
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "25px" }}>
        <h1 style={{ margin: 0 , color : 'black'}}>Module Feedback</h1>
        <p style={{ color: "#666" }}>Review teacher insights regarding specific training modules</p>
      </div>

      {/* Filter Category Choice */}
      <div style={styles.filterContainer}>
        <span style={{ fontWeight: "bold" }}>Filter by Category:</span>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
        >
          <option value="All">All Categories</option>
          <option value="Content Quality">Content Quality</option>
          <option value="Technical Issue">Technical Issue</option>
          <option value="Suggestion">Suggestion</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Teacher</th>
            <th style={styles.th}>Module Name</th>
            <th style={styles.th}>Topic</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Feedback Message</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item) => (
            <tr key={item.id}>
              <td style={styles.td}><strong>{item.teacher}</strong></td>
              <td style={styles.td}>{item.moduleName}</td>
              <td style={styles.td}>{item.topic}</td>
              <td style={styles.td}>
                <span style={styles.badge(item.category)}>{item.category}</span>
              </td>
              <td style={{ ...styles.td, maxWidth: "300px" }}>{item.message}</td>
              <td style={styles.td}>{item.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardLayout>
  );
};

export default Feedback;