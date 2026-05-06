const modules = ["Stores", "Store Packages", "Subscriptions", "Payments", "Invoices", "Products", "Marketplace", "Brands & Models", "Valuation Engine", "Repair Requests", "Exchange Requests", "Sell Device Requests", "Referral System", "Point Wallets", "Customers", "Staff Admins", "Store Admins", "SEO", "Banners", "Reports", "Settings"];

export default function SuperAdminPage() {
  return <Dashboard title="Super Admin Control Room" modules={modules} />;
}

function Dashboard({ title, modules }: { title: string; modules: string[] }) {
  return (
    <main className="shell" style={{ padding: "42px 0" }}>
      <h1>{title}</h1>
      <p className="muted">Central rhythm for all stores, customers, packages, referrals, points, and reports.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {modules.map((module) => <div key={module} className="card" style={{ padding: 16, fontWeight: 800 }}>{module}</div>)}
      </div>
    </main>
  );
}
