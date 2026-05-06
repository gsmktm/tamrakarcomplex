import { Link } from "react-router-dom";
import { ShieldAlert, Home, LayoutDashboard } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/common/SEO";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPathForRole } from "@/lib/authRedirects";

export default function Unauthorized() {
  const { role } = useAuth();
  const dashboardPath = getDashboardPathForRole(role);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO title="Access denied - Tamrakar" description="You do not have permission to view this page." noindex />
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <section className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Access denied</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Your account does not have permission to open this area. Use your dashboard or return to the public site.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to={dashboardPath}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Go to dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to home
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
