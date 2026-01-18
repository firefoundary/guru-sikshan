import React, { useState } from "react";

const Feedback = () => {
  const [feedbacks] = useState([
    { id: 1, name: "Arjun Mehta", school: "GHS Bangalore", text: "The training modules are very intuitive.", date: "Jan 18" },
    { id: 2, name: "Priya Das", school: "DIET Primary", text: "Would love to see more Science content.", date: "Jan 17" },
    { id: 3, name: "Suresh Raina", school: "KV North", text: "App is lagging during image uploads.", date: "Jan 17" },
  ]);

  return (
    <div className="p-8 bg-black min-h-screen text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Teacher Feedback</h1>
          <p className="text-gray-400">Direct responses from the mobile application</p>
        </div>

        {/* Clean Table */}
        <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#111]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">Educator</th>
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">Comment</th>
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={f.id} className="border-b border-gray-800 hover:bg-gray-900 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-blue-400">{f.name}</div>
                    <div className="text-xs text-gray-500">{f.school}</div>
                  </td>
                  <td className="p-4 text-gray-200">
                    <span className="italic text-gray-400">"</span>
                    {f.text}
                    <span className="italic text-gray-400">"</span>
                  </td>
                  <td className="p-4 text-right text-gray-500 text-sm font-mono">{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Feedback;