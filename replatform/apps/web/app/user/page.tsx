const modules = ["My Profile", "My Orders", "My Valuations", "My Sell Requests", "My Exchange Requests", "My Repair Requests", "My Wishlist", "My Referral Links", "My Points", "My Reviews"];

export default function UserDashboardPage() {
  return (
    <main className="shell" style={{ padding: "42px 0" }}>
      <h1>Customer Dashboard</h1>
      <p className="muted">Orders, requests, points, referrals, reviews, and saved devices.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {modules.map((module) => <div key={module} className="card" style={{ padding: 16, fontWeight: 800 }}>{module}</div>)}
      </div>
    </main>
  );
}
