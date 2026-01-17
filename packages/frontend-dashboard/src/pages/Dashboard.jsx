import DashboardLayout from "../layout/DashboardLayout";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <h1>Teacher Dashboard</h1>

      <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
        <StatCard title="Total Classes" value="12" />
        <StatCard title="Students" value="240" />
        <StatCard title="Assignments" value="18" />
      </div>
    </DashboardLayout>
  );
}
