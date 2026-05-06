import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const StoreSubscription = lazy(() => import("@/pages/admin/StoreSubscription"));

export default function MySubscription() {
  return (
    <div className="flex min-h-screen flex-col">
      <SEO
        title="My Subscription"
        description="Manage your Silver, Gold, or Diamond store package, usage limits, and billing details."
        url="/my-subscription"
        noindex
      />
      <Header />
      <main className="flex-1 bg-secondary/20">
        <Suspense
          fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <StoreSubscription />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
