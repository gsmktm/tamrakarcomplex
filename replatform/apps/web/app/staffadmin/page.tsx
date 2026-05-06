const modules = ["Store Verification", "Product Approval", "Marketplace Approval", "Valuation Monitoring", "Repair Monitoring", "Exchange Monitoring", "Sell Device Monitoring", "Referral Review", "Complaints", "Reports"];

export default function StaffAdminPage() {
  return (
    <main className="shell" style={{ padding: "42px 0" }}>
      <h1>Staff Admin Operations</h1>
      <p className="muted">Permission-scoped verification, review, monitoring, escalation, and reporting.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {modules.map((module) => <div key={module} className="card" style={{ padding: 16, fontWeight: 800 }}>{module}</div>)}
      </div>
    </main>
  );
}
