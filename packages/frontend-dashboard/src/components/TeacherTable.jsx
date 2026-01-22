import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TeacherTable = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Fetch teachers from Supabase
      // We explicitly select cluster and district (if it exists, otherwise we mock it)
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine status color
  // (In a real app, you'd check 'last_login' or 'is_active' from DB)
  const getStatusStyle = (index) => {
    // Simulating some inactive users for visual variety
    const isActive = index % 5 !== 0; // Every 5th user is "Inactive"
    
    if (isActive) {
      return {
        bg: "#dcfce7", // Green-100
        text: "#166534", // Green-800
        label: "Active"
      };
    } else {
      return {
        bg: "#f3f4f6", // Gray-100
        text: "#374151", // Gray-700
        label: "Inactive"
      };
    }
  };

  if (loading) return <div style={{ padding: "20px", color: "#666" }}>Loading teachers...</div>;

  return (
    <div style={{ width: "100%", fontFamily: "sans-serif", padding: "20px" }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#111", marginBottom: "5px" }}>
            Registered Teachers
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>
            Manage teacher accounts, regions, and cluster assignments
          </p>
        </div>
        <div style={{ 
          backgroundColor: "#eff6ff", 
          color: "#1e40af", 
          padding: "8px 16px", 
          borderRadius: "6px", 
          fontWeight: "600",
          fontSize: "14px"
        }}>
          Total Teachers: {teachers.length}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ 
        border: "1px solid #e5e7eb", 
        borderRadius: "8px", 
        overflow: "hidden", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        backgroundColor: "white"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          
          {/* Table Header */}
          <thead>
            <tr style={{ backgroundColor: "#1e3a8a", color: "white" }}>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Teacher Name</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Region / District</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cluster</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Employee ID</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#6b7280" }}>
                  No teachers found in the database.
                </td>
              </tr>
            ) : (
              teachers.map((teacher, index) => {
                const status = getStatusStyle(index);
                return (
                  <tr key={teacher.id} style={{ 
                    borderBottom: "1px solid #e5e7eb", 
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" 
                  }}>
                    
                    {/* Name & Email */}
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: "bold", color: "#111827", fontSize: "14px" }}>
                        {teacher.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        {teacher.email}
                      </div>
                    </td>

                    {/* Region (Assuming 'district' or mocking it) */}
                    <td style={{ padding: "16px", fontSize: "14px", color: "#374151" }}>
                      {teacher.district || "Central District"} 
                      {/* ^ Change "Central District" to a default if your DB is empty */}
                    </td>

                    {/* Cluster */}
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        display: "inline-block",
                        padding: "4px 10px", 
                        backgroundColor: "#e0e7ff", 
                        color: "#4338ca", 
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}>
                        {teacher.cluster || "Unassigned"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 12px", 
                        borderRadius: "9999px", 
                        backgroundColor: status.bg, 
                        color: status.text, 
                        fontSize: "12px", 
                        fontWeight: "600",
                        border: `1px solid ${status.bg}`
                      }}>
                        {/* Little dot indicator */}
                        <span style={{ 
                          height: "6px", 
                          width: "6px", 
                          borderRadius: "50%", 
                          backgroundColor: "currentColor", 
                          marginRight: "6px",
                          opacity: 0.7
                        }}></span>
                        {status.label}
                      </span>
                    </td>

                    {/* Employee ID */}
                    <td style={{ padding: "16px", fontFamily: "monospace", color: "#6b7280", fontSize: "13px" }}>
                      {teacher.employee_id || teacher.id.slice(0,8)}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherTable;