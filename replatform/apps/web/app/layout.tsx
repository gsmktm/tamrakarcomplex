import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tamrakar Complex",
  description: "Digital mobile complex for stores, products, repair, valuation, exchange, referrals, and points.",
  metadataBase: new URL("https://tamrakarcomplex.com"),
};

const nav = [
  ["/stores", "Stores"],
  ["/marketplace", "Marketplace"],
  ["/repair", "Repair"],
  ["/sell-your-phone", "Sell"],
  ["/valuation-estimator", "Valuation"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: "1px solid var(--border)", background: "#fff" }}>
          <div className="shell" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <Link href="/" style={{ fontWeight: 900, letterSpacing: 0 }}>TamrakarComplex.com</Link>
            <nav style={{ display: "flex", gap: 18, fontSize: 14, fontWeight: 700 }}>
              {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
