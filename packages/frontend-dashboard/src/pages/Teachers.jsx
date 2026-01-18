import React, { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout"; // Import the layout

const Teachers = () => {
  const [teachers] = useState([
    { id: 1, name: "Arjun Mehta", subject: "Mathematics", status: "Active" },
    { id: 2, name: "Priya Das", subject: "Science", status: "Active" },
    { id: 3, name: "Suresh Raina", subject: "English", status: "Away" },
    { id: 4, name: "Meera Bai", subject: "Social Studies", status: "Active" },
  ]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <div className="max-w-2xl w-full bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* ... existing card content ... */}
          <div className="p-8 border-b border-white/5 bg-white/5 text-white">
            <h1 className="text-3xl font-bold">Teacher Directory</h1>
          </div>
          <div className="p-4">
            {teachers.map((t) => (
               <div key={t.id} className="text-white p-2 border-b border-white/5">{t.name} - {t.status}</div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Teachers;