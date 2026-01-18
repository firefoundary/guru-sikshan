import React, { useState } from "react";

const Teachers = () => {
  const [teachers] = useState([
    { id: 1, name: "Arjun Mehta", subject: "Mathematics", school: "GHS Bangalore", status: "Active" },
    { id: 2, name: "Priya Das", subject: "Science", school: "DIET Primary", status: "Active" },
    { id: 3, name: "Suresh Raina", subject: "English", school: "KV North", status: "Away" },
    { id: 4, name: "Meera Bai", subject: "Social Studies", school: "GMS South", status: "Active" },
  ]);

  return (
    <div className="p-8 bg-black min-h-screen text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Teacher Directory</h1>
          <p className="text-gray-400">educators status</p>
        </div>

        {/* Directory Table */}
        <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#111]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">Educator</th>
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">Subject & School</th>
                <th className="p-4 text-gray-400 text-sm font-semibold uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-900 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-blue-400">{t.name}</div>
                    <div className="text-xs text-gray-500 italic">ID: #00{t.id}</div>
                  </td>
                  <td className="p-4 text-gray-200">
                    <div className="text-sm font-medium">{t.subject}</div>
                    <div className="text-xs text-gray-400">{t.school}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Teachers;