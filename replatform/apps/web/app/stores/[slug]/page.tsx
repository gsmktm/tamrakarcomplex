import Link from "next/link";

const tabs = ["products", "valuation", "repair", "exchange", "accessories", "offers"];

export default function StoreDetailPage({ params }: { params: { slug: string } }) {
  return (
    <main>
      <section style={{ background: "#111827", color: "white", padding: "48px 0" }}>
        <div className="shell">
          <p style={{ color: "#fbbf24", fontWeight: 800 }}>Verified store page</p>
          <h1 style={{ fontSize: 44, margin: 0 }}>{params.slug.replaceAll("-", " ")}</h1>
          <p style={{ color: "#d1d5db" }}>Products, valuation, repair, exchange, accessories, offers, leads, reviews, and SEO.</p>
        </div>
      </section>
      <section className="shell" style={{ padding: "28px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {tabs.map((tab) => <Link key={tab} className="btn" href={`/stores/${params.slug}/${tab}`}>{tab}</Link>)}
      </section>
    </main>
  );
}
