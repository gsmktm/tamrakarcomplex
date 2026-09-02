export type AeoFaqItem = {
  question: string;
  answer: string;
};

export function AeoFaq({ items, title = "Frequently asked questions" }: { items: AeoFaqItem[]; title?: string }) {
  return (
    <section className="space-y-4" aria-labelledby="aeo-faq-heading">
      <h2 id="aeo-faq-heading" className="font-display text-2xl font-bold">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.question} className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">{item.question}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
