export default function StoreOffersPage({ params }: { params: { slug: string } }) {
  return <main className="shell" style={{ padding: "42px 0" }}><h1>Store Offers</h1><p className="muted">{params.slug} banners, campaigns, referral-ready offers.</p></main>;
}
