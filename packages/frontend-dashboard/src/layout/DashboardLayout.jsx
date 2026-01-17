export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: "220px", background: "#0f172a", color: "white", padding: "16px" }}>
        <h3>Guru Sikshan</h3>
        <p>Dashboard</p>
        <p>Modules</p>
        <p>Feedback</p>
      </aside>

      <main style={{ flex: 1, padding: "24px" }}>
        {children}
      </main>
    </div>
  );
}
