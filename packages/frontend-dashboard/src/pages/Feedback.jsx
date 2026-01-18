import React, { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout"; // Import the layout

const Feedback = () => {
  const [feedbacks] = useState([
    { id: 1, name: "Arjun Mehta", school: "GHS Bangalore", text: "Intuitive training modules.", date: "Jan 18" },
    { id: 2, name: "Priya Das", school: "DIET Primary", text: "Need more Science content.", date: "Jan 17" },
  ]);

  return (
    <DashboardLayout>
      <div className="p-8 bg-black min-h-screen text-white font-sans">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Teacher : module-feedback</h1>
          <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#111]">
            
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Feedback;