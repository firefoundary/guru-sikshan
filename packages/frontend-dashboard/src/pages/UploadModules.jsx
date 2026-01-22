import React, { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import { supabase } from "../supabaseClient";// Ensure you have this file

const UploadModules = () => {
  const [moduleId, setModuleId] = useState("");
  const [moduleData, setModuleData] = useState({
    title: "",
    competency_area: "Pedagogy", // Changed from 'category' to match DB
    description: "",
    content_url: ""
  });
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch existing module
  const handleFetchModule = async (e) => {
    e.preventDefault();
    if (!moduleId) return alert("Please enter a Module ID");
    
    setLoading(true);
    const { data, error } = await supabase
      .from('training_modules')
      .select('*')
      .eq('id', moduleId)
      .single();

    if (error) {
      alert("Module not found!");
    } else {
      setModuleData({
        title: data.title,
        competency_area: data.competency_area,
        description: data.description || "",
        content_url: data.content_url || ""
      });
      setIsUpdateMode(true);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isUpdateMode) {
        const { error } = await supabase
          .from('training_modules')
          .update(moduleData)
          .eq('id', moduleId);
        
        if (error) throw error;
        alert("Module updated successfully!");
      } else {
        const { error } = await supabase
          .from('training_modules')
          .insert([moduleData]);
          
        if (error) throw error;
        alert("New module published!");
        // Reset form
        setModuleData({ title: "", competency_area: "Pedagogy", description: "", content_url: "" });
      }
    } catch (error) {
      alert("Error saving module: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    // ... keep your existing styles ...
    card: { backgroundColor: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "700px" },
    input: { width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1rem" },
    label: { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" },
    button: { backgroundColor: "#003d82", color: "white", padding: "12px 25px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.7 : 1 }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "30px" }}>
        <h1>{isUpdateMode ? "Update Existing Module" : "Upload New Module"}</h1>
        <p style={{ color: "#666" }}>Add content for the AI to recommend</p>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Module Title</label>
          <input 
            style={styles.input} 
            type="text" 
            value={moduleData.title}
            onChange={(e) => setModuleData({...moduleData, title: e.target.value})}
            required 
          />

          <label style={styles.label}>Competency Area (AI uses this to match)</label>
          <select 
            style={styles.input}
            value={moduleData.competency_area}
            onChange={(e) => setModuleData({...moduleData, competency_area: e.target.value})}
          >
            <option value="Pedagogy">Pedagogy</option>
            <option value="Content Knowledge">Content Knowledge</option>
            <option value="Classroom Management">Classroom Management</option>
            <option value="Student Engagement">Student Engagement</option>
            <option value="Technology Integration">Technology Integration</option>
          </select>

          <label style={styles.label}>Content URL (PDF/Video Link)</label>
          <input 
            style={styles.input} 
            type="text" 
            placeholder="https://..."
            value={moduleData.content_url}
            onChange={(e) => setModuleData({...moduleData, content_url: e.target.value})}
          />

          <label style={styles.label}>Description</label>
          <textarea 
            style={{ ...styles.input, height: "100px" }} 
            value={moduleData.description}
            onChange={(e) => setModuleData({...moduleData, description: e.target.value})}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Processing..." : (isUpdateMode ? "Update Module" : "Publish Module")}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default UploadModules;