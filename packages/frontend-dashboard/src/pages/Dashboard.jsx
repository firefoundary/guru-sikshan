import React from "react";
import DashboardLayout from "../layout/DashboardLayout";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  // These values represent the data coming from your mobile app flow
  const stats = {
    clustersActive: "12",
    classroomIssues: "45",
    modulesSuggested: "38",
    resourcesAccessed: "128"
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-black min-h-screen">
        {/* Header section with white text */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            DIET Authority Dashboard
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Monitoring teacher submissions and AI-suggested modules
          </p>
        </div>

        {/* Stats Grid - Direct & Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Active Clusters" 
            value={stats.clustersActive} 
            description="Regional mobile activity"
          />
          <StatCard 
            title="Classroom Issues" 
            value={stats.classroomIssues} 
            description="Teacher submissions"
          />
          <StatCard 
            title="AI Suggestions" 
            value={stats.modulesSuggested} 
            description="Gemini-mapped modules"
          />
          <StatCard 
            title="Resources Accessed" 
            value={stats.resourcesAccessed} 
            description="Mobile app downloads"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}