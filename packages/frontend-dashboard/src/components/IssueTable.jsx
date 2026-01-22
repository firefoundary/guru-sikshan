import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const IssueTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Feedback 
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select(`*, teachers (name, email)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch AI suggestions
      const feedbackIds = feedbackData.map(f => f.id);
      let aiMap = {};
      if (feedbackIds.length > 0) {
        const { data: aiData } = await supabase
          .from('ai_responses')
          .select('feedback_id, assigned_module')
          .in('feedback_id', feedbackIds);
        
        if (aiData) aiData.forEach(i => aiMap[i.feedback_id] = i);
      }

      const mergedData = feedbackData.map(item => ({
        ...item,
        ai: aiMap[item.id],
        // ✅ NO MORE MOCK DATA. Only show what's in the DB.
        rating: item.training_rating, 
        comment: item.training_comment
      }));

      setData(mergedData);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div style={{ width: "100%", fontFamily: "sans-serif", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#111" }}>Teacher Feedback & AI Training</h1>
        <p style={{ color: "#666" }}>Monitoring issues, solutions, and teacher satisfaction</p>
      </div>

      <div style={{ 
        border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", 
        backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e3a8a", color: "white" }}>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase" }}>Teacher</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase" }}>Issue</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase" }}>AI Module</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase" }}>Teacher Rating</th>
              <th style={{ padding: "16px", fontSize: "13px", textTransform: "uppercase" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                
                {/* Teacher */}
                <td style={{ padding: "16px" }}>
                  <div style={{ fontWeight: "bold" }}>{row.teachers?.name || "Unknown"}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>{row.teachers?.email}</div>
                </td>

                {/* Issue */}
                <td style={{ padding: "16px", maxWidth: "300px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                    {row.category}
                  </span>
                  <p style={{ fontSize: "14px", margin: "4px 0 0 0", color: "#374151" }}>{row.description}</p>
                </td>

                {/* AI Module */}
                <td style={{ padding: "16px" }}>
                   <span style={{ display: "inline-block", padding: "4px 10px", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "6px", fontSize: "12px", fontWeight: "500", border: "1px solid #dbeafe" }}>
                     📘 {row.ai?.assigned_module || "General Training"}
                   </span>
                </td>

                {/* Rating Column */}
                <td style={{ padding: "16px" }}>
                  {row.rating ? (
                    <div>
                      <div style={{ display: "flex", gap: "2px", marginBottom: "4px" }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < row.rating ? "#facc15" : "#e5e7eb", fontSize: "16px" }}>★</span>
                        ))}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>"{row.comment}"</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Not started</span>
                  )}
                </td>

                {/* Date */}
                <td style={{ padding: "16px", whiteSpace: "nowrap", fontSize: "13px", color: "#666" }}>
                  {new Date(row.created_at).toLocaleDateString()}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IssueTable;