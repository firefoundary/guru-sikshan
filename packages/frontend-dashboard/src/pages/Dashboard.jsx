import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../layout/DashboardLayout";
import StatCard from "../components/StatCard";
// ❌ Removed IssueTable import from here

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [stats, setStats] = useState({
    clusters: 0,
    issues: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // 1. Get Total Issues
      const { count: issueCount, error: issueError } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      // 2. Get Active Clusters
      const { data: clusterData } = await supabase
        .from('feedback')
        .select('cluster');
      
      const uniqueClusters = clusterData 
        ? new Set(clusterData.map(item => item.cluster)).size 
        : 0;

      // 3. Get Resolved Issues
      const { count: resolvedCount } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      if (issueError) throw issueError;

      setStats({
        clusters: uniqueClusters,
        issues: issueCount || 0,
        resolved: resolvedCount || 0
      });

    } catch (error) {
      console.error("❌ Error fetching stats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: 'black' }}>DIET Authority Dashboard</h1>
        <p style={{ color: '#666' }}>Real-time overview of teacher feedback</p>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "30px" }}>
        <StatCard title="Active Clusters" value={loading ? "..." : stats.clusters} />
        <StatCard title="Total Issues" value={loading ? "..." : stats.issues} />
        <StatCard title="Resolved Cases" value={loading ? "..." : stats.resolved} />
      </div>

      {/* ✅ Table is gone from here. It is now only in Feedback.jsx */}
      
    </DashboardLayout>
  );
};

export default Dashboard;