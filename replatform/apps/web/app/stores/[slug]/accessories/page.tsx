export default function StoreAccessoriesPage({ params }: { params: { slug: string } }) {
  return <main className="shell" style={{ padding: "42px 0" }}><h1>Store Accessories</h1><p className="muted">{params.slug} accessories catalog.</p></main>;
}
