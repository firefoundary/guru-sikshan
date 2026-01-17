export default function StatCard({ title, value }) {
  return (
    <div style={{
      background: "#e2e8f0",
      padding: "20px",
      borderRadius: "12px",
      minWidth: "180px"
    }}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}
