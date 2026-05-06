export default function MarketplacePage() {
  return <Surface title="Marketplace" text="Store-listed new phones, used phones, accessories, repair services, exchange offers, approval, boost, buy-now, enquiry, and referral share." />;
}

function Surface({ title, text }: { title: string; text: string }) {
  return <main className="shell" style={{ padding: "42px 0" }}><h1>{title}</h1><p className="muted">{text}</p></main>;
}
