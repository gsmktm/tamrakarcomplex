export default function StoreProductsPage({ params }: { params: { slug: string } }) {
  return <StoreSubPage slug={params.slug} title="Store Products" description="New phones, used phones, accessories, stock, warranty, enquiry, buy-now, and referral share." />;
}

function StoreSubPage(props: { slug: string; title: string; description: string }) {
  return <main className="shell" style={{ padding: "42px 0" }}><h1>{props.title}</h1><p className="muted">{props.slug} · {props.description}</p></main>;
}
