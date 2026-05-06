const modules = ["Store Profile", "My Package", "My Subscription", "Products", "Marketplace Listings", "Valuation Requests", "Repair Requests", "Exchange Requests", "Sell Device Requests", "Offers", "Store Staff", "Leads", "Analytics"];

export default function StoreAdminPage() {
  return (
    <main className="shell" style={{ padding: "42px 0" }}>
      <h1>Store Admin Dashboard</h1>
      <p className="muted">One store, one identity, one complete operating room.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {modules.map((module) => <div key={module} className="card" style={{ padding: 16, fontWeight: 800 }}>{module}</div>)}
      </div>
    </main>
  );
}
