import Link from "next/link";
import { PACKAGE_DEFAULTS } from "@tamrakar/domain";

export default function HomePage() {
  return (
    <main>
      <section style={{ background: "#0f172a", color: "white", padding: "72px 0" }}>
        <div className="shell">
          <p style={{ color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>One digital mobile complex</p>
          <h1 style={{ fontSize: "clamp(36px, 7vw, 72px)", lineHeight: 1, margin: "12px 0", maxWidth: 880 }}>
            250+ mobile stores, one graceful marketplace rhythm.
          </h1>
          <p style={{ maxWidth: 680, color: "#cbd5e1", fontSize: 18 }}>
            Stores keep their own identity while Super Admin controls packages, referrals, points, valuation, SEO, and trust.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link className="btn" href="/stores">Browse Stores</Link>
            <Link className="btn" href="/storeadmin" style={{ background: "white" }}>Store Dashboard</Link>
          </div>
        </div>
      </section>
      <section className="shell" style={{ padding: "48px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {Object.entries(PACKAGE_DEFAULTS).map(([slug, pkg]) => (
          <div key={slug} className="card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>{pkg.name}</h2>
            <p className="muted">Rs. {pkg.monthlyPrice.toLocaleString()} / month</p>
            <p>{pkg.productLimit} products · {pkg.analyticsLevel} analytics · {pkg.supportLevel} support</p>
          </div>
        ))}
      </section>
    </main>
  );
}
