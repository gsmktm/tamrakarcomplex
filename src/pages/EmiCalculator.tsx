import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calculator, CreditCard, Info, Search, ShieldCheck, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductsQuery } from "@/hooks/useProducts";
import { calculateEmiQuote, formatEmiNpr } from "@/lib/emiCalculator";

const TENURES = [3, 6, 12, 18, 24, 36];
const parsePrice = (raw: string | null) => {
  const value = Number(raw);
  return raw && Number.isFinite(value) && value > 0 ? value : 100000;
};

export default function EmiCalculator() {
  const [params] = useSearchParams();
  const [productName, setProductName] = useState(params.get("product") ?? "");
  const [selectedName, setSelectedName] = useState(params.get("product") ?? "");
  const [productPrice, setProductPrice] = useState(parsePrice(params.get("price")));
  const [downPayment, setDownPayment] = useState(0);
  const [annualInterestRate, setAnnualInterestRate] = useState(0);
  const [months, setMonths] = useState(12);
  const [processingFee, setProcessingFee] = useState(0);

  const searchTerm = productName.trim();
  const { data: products, isFetching } = useProductsQuery({
    search: searchTerm.length > 1 ? searchTerm : undefined,
    pageSize: 6,
    inStockOnly: true,
  });

  const quote = useMemo(() => {
    try {
      return { value: calculateEmiQuote({ productPrice, downPayment, annualInterestRate, months, processingFee }), error: "" };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : "Please check the amount and EMI inputs." };
    }
  }, [productPrice, downPayment, annualInterestRate, months, processingFee]);

  const chooseProduct = (name: string, price: number) => {
    setProductName(name);
    setSelectedName(name);
    setProductPrice(price);
    setDownPayment(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="EMI Calculator Nepal | Tamrakar Complex"
        description="Estimate monthly device installment payments in Nepali rupees. Compare terms, down payments, interest and processing fees before contacting a lender."
        url="/emi"
      />
      <Header />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-br from-[#11130F] to-[#273126] text-white">
          <div className="container py-12 sm:py-16">
            <div className="flex items-center gap-2 text-[#D8FF3E] text-sm font-semibold uppercase tracking-wider">
              <Calculator className="h-5 w-5" /> Finance planning
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-3xl sm:text-5xl font-bold">Plan your next device with an EMI estimate.</h1>
            <p className="mt-4 max-w-2xl text-white/75 leading-relaxed">
              Work out a monthly budget before you visit a verified shop. Estimates are not loan offers or approvals.
            </p>
          </div>
        </section>

        <div className="container grid gap-6 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Choose a device or enter an amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emi-product">Search the Tamrakar Complex catalog</Label>
                <Input
                  id="emi-product"
                  value={productName}
                  placeholder="Search iPhone, Samsung, laptop..."
                  onChange={event => { setProductName(event.target.value); setSelectedName(""); }}
                />
                {searchTerm.length > 1 && productName !== selectedName && (
                  <div className="max-h-56 overflow-y-auto rounded-xl border" aria-label="Matching products">
                    {products?.items.filter(product => Number(product.price_value) > 0).map(product => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b p-3 text-left text-sm hover:bg-muted last:border-b-0"
                        onClick={() => chooseProduct(product.name, Number(product.price_value))}
                      >
                        <span className="line-clamp-2 font-medium">{product.name}</span>
                        <span className="shrink-0 tabular-nums">{formatEmiNpr(Number(product.price_value))}</span>
                      </button>
                    ))}
                    {!isFetching && products?.items.filter(product => Number(product.price_value) > 0).length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">No priced matches found. You can enter an amount below.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emi-price">Device price (NPR)</Label>
                  <Input id="emi-price" type="number" min={0} step="0.01" value={productPrice} onChange={event => setProductPrice(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emi-down">Down payment (NPR)</Label>
                  <Input id="emi-down" type="number" min={0} max={productPrice} step="0.01" value={downPayment} onChange={event => setDownPayment(Number(event.target.value))} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[0, 20, 40].map(percent => (
                  <Button key={percent} type="button" variant={Math.abs(downPayment - productPrice * percent / 100) < 0.01 ? "default" : "outline"} size="sm" onClick={() => setDownPayment(Math.round(productPrice * percent) / 100)}>
                    {percent}% down
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emi-rate">Illustrative annual interest rate (%)</Label>
                <Input id="emi-rate" type="number" min={0} max={100} step="0.1" value={annualInterestRate} onChange={event => setAnnualInterestRate(Number(event.target.value))} />
                <p className="text-xs text-muted-foreground">Default 0% is a calculation scenario, not a guarantee that a 0% bank offer exists.</p>
              </div>
              <div className="space-y-2">
                <Label>Repayment tenure</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Repayment tenure">
                  {TENURES.map(tenure => (
                    <Button key={tenure} type="button" variant={months === tenure ? "default" : "outline"} size="sm" onClick={() => setMonths(tenure)}>
                      {tenure} months
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emi-fee">Processing fee (NPR, if applicable)</Label>
                <Input id="emi-fee" type="number" min={0} step="0.01" value={processingFee} onChange={event => setProcessingFee(Number(event.target.value))} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="bg-[#11130F] p-6 text-white">
                <p className="flex items-center gap-2 text-sm text-white/65"><CreditCard className="h-4 w-4" /> Estimated monthly payment</p>
                <p className="mt-3 text-4xl font-bold text-[#D8FF3E] tabular-nums">
                  {quote.value ? formatEmiNpr(quote.value.monthlyPayment) : "—"}
                </p>
                <p className="mt-2 text-sm text-white/70">Over {months} months, subject to lender terms</p>\n                {quote.value && quote.value.finalPayment !== quote.value.monthlyPayment && (\n                  <p className="mt-1 text-xs text-white/65">Final payment adjusted for rounding: {formatEmiNpr(quote.value.finalPayment)}</p>\n                )}
              </div>
              <CardContent className="space-y-3 pt-5">
                {quote.value ? (
                  <>
                    {[
                      ["Device price", quote.value.productPrice],
                      ["Down payment", quote.value.downPayment],
                      ["Amount financed", quote.value.principal],
                      ["Total interest", quote.value.totalInterest],
                      ["Processing fee", quote.value.processingFee],
                      ["Total payable including down payment", quote.value.totalPayable],
                    ].map(([label, amount]) => (
                      <div key={String(label)} className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <strong className="text-right tabular-nums">{formatEmiNpr(Number(amount))}</strong>
                      </div>
                    ))}
                  </>
                ) : (
                  <p role="alert" className="text-sm text-destructive">{quote.error}</p>
                )}
                <div className="rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mb-1 inline h-4 w-4" /> Illustrative calculation only. Confirm lender availability, eligibility, effective APR, fees, product price and repayment schedule. No payment or loan application is submitted here.
                </div>
                {quote.value ? (
                  <Button asChild className="w-full"><Link to="/contact-us">Ask about actual financing <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                ) : (
                  <Button className="w-full" disabled>Correct inputs to continue</Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 pt-6 text-sm">
                <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Next steps</p>
                <p className="text-muted-foreground">Choose a device, compare monthly costs, then contact a participating shop to confirm an actual bank or lender plan.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/cat/mobiles?tab=buy" className="font-medium text-primary hover:underline">Browse gadgets</Link>
                  <Link to="/exchange-your-phone" className="font-medium text-primary hover:underline">Estimate exchange</Link>
                  <Link to="/compare" className="font-medium text-primary hover:underline">Compare devices</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
