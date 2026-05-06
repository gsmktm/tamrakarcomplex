import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OrderFailed() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-16">
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold">Order Payment Failed</h1>
          <p className="mt-3 text-muted-foreground">
            We could not complete your payment. Please try checkout again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link to="/checkout">Retry Checkout</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/marketplace">Back to Marketplace</Link>
            </Button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
