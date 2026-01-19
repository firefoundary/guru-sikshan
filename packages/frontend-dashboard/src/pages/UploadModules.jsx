import React, { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";

const UploadModules = () => {
  const [moduleId, setModuleId] = useState("");
  const [moduleData, setModuleData] = useState({
    title: "",
    category: "Pedagogy",
    topic: "",
    description: "",
    file: null
  });
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Function to fetch existing module data by ID
  const handleFetchModule = (e) => {
    e.preventDefault();
    if (!moduleId) return alert("Please enter a Module ID");

    // Replace with your real API call: fetch(`/api/modules/${moduleId}`)
    console.log("Fetching module:", moduleId);
    
    // Mocking a successful fetch
    const mockFoundModule = {
      title: "Advanced Fractions v1",
      category: "Subject Knowledge",
      topic: "Mathematics",
      description: "Original description of the fractions module."
    };

    setModuleData(mockFoundModule);
    setIsUpdateMode(true);
    alert("Module data loaded! You can now edit and update.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isUpdateMode) {
      console.log("Updating existing module:", moduleId, moduleData);
      alert(`Module ${moduleId} updated successfully!`);
    } else {
      console.log("Uploading new module:", moduleData);
      alert("New module uploaded successfully!");
    }
  };

  const styles = {
    card: { backgroundColor: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "700px" },
    input: { width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1rem" },
    row: { display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "20px" },
    label: { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" },
    button: { backgroundColor: "#003d82", color: "white", padding: "12px 25px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
    secondaryButton: { backgroundColor: "#6c757d", color: "white", padding: "12px 20px", border: "none", borderRadius: "8px", cursor: "pointer", height: "46px" }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "30px" }}>
        <h1>{isUpdateMode ? "Update Existing Module" : "Upload New Module"}</h1>
        <p style={{ color: "#666" }}>Manage your training resources for the mobile app</p>
      </div>

      <div style={styles.card}>
        {/* Module ID Search Section */}
        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Module ID (to update existing)</label>
            <input 
              style={{ ...styles.input, marginBottom: 0 }} 
              type="text" 
              placeholder="e.g., MOD-123" 
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
            />
          </div>
          <button type="button" onClick={handleFetchModule} style={styles.secondaryButton}>Fetch Module</button>
        </div>

        <hr style={{ margin: "20px 0", border: "0.5px solid #eee" }} />

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Module Title</label>
          <input 
            style={styles.input} 
            type="text" 
            value={moduleData.title}
            onChange={(e) => setModuleData({...moduleData, title: e.target.value})}
            required 
          />

          <label style={styles.label}>Topic</label>
          <input 
            style={styles.input} 
            type="text" 
            placeholder="e.g., Algebra, Ethics, Science"
            value={moduleData.topic}
            onChange={(e) => setModuleData({...moduleData, topic: e.target.value})}
            required 
          />

          <label style={styles.label}>Category</label>
          <select 
            style={styles.input}
            value={moduleData.category}
            onChange={(e) => setModuleData({...moduleData, category: e.target.value})}
          >
            <option>Student Management</option>
            <option>Subject Knowledge</option>
            <option>Classroom Management</option>
          </select>

          <label style={styles.label}>Description</label>
          <textarea 
            style={{ ...styles.input, height: "100px", fontFamily: "inherit" }} 
            value={moduleData.description}
            onChange={(e) => setModuleData({...moduleData, description: e.target.value})}
          />

          <button type="submit" style={styles.button}>
            {isUpdateMode ? "Update Module" : "Publish Module"}
          </button>
          
          {isUpdateMode && (
            <button 
              type="button" 
              onClick={() => {setIsUpdateMode(false); setModuleId(""); setModuleData({title: "", category: "Pedagogy", topic: "", description: ""})}}
              style={{ ...styles.secondaryButton, marginLeft: "10px", backgroundColor: "transparent", color: "#666" }}
            >
              Cancel Update
            </button>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
};

export default UploadModules;