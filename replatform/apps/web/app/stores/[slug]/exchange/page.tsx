export default function StoreExchangePage({ params }: { params: { slug: string } }) {
  return <main className="shell" style={{ padding: "42px 0" }}><h1>Store Exchange</h1><p className="muted">{params.slug} exchange offers and inspection workflow.</p></main>;
}
