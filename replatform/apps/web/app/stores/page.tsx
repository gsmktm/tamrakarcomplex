import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Best Mobile Shops in Tamrakar Complex",
  description: "Find verified mobile stores, repair specialists, used phone shops, accessories stores, and premium partners.",
};

const stores = [
  { name: "ABC Mobile", slug: "abc-mobile", package: "Diamond", location: "Inside Tamrakar Complex, Shop A-12" },
  { name: "New Road Apple Care", slug: "new-road-apple-care", package: "Gold", location: "New Road, Kathmandu" },
];

export default function StoresPage() {
  return (
    <main className="shell" style={{ padding: "42px 0" }}>
      <h1>Stores</h1>
      <p className="muted">Package-ranked, verified, searchable mobile shops.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {stores.map((store) => (
          <Link key={store.slug} href={`/stores/${store.slug}`} className="card" style={{ padding: 20 }}>
            <strong>{store.name}</strong>
            <p className="muted">{store.location}</p>
            <span>{store.package}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
