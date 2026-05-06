import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Search, Home, ArrowLeft, Smartphone, WifiOff, Cpu, ZapOff } from "lucide-react";
import { SEO } from "@/components/common/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO title="404 - Page Not Found" description="The page you requested could not be found at Tamrakar Complex." noindex />
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-16 relative overflow-hidden">
        {/* Tech-themed Background Elements */}
        <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] opacity-[0.03] rotate-12">
            <Cpu className="w-64 h-64 text-primary" />
          </div>
          <div className="absolute bottom-[10%] right-[5%] opacity-[0.03] -rotate-12">
            <Smartphone className="w-80 h-80 text-secondary" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="container max-w-4xl mx-auto text-center z-10">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 animate-ping opacity-20 bg-primary rounded-full" />
            <div className="relative bg-white dark:bg-slate-900 p-8 rounded-full shadow-2xl border border-primary/10">
              <WifiOff className="h-20 w-20 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg">
              <ZapOff className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-8xl md:text-9xl font-black font-display tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-700">
                404
              </h1>
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                Connection Lost!
              </h2>
            </div>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              We couldn't find the page you're looking for. It might have been "unplugged" or moved to a different frequency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button asChild size="lg" className="min-w-[200px] h-14 text-lg rounded-2xl hero-gradient shadow-xl hover:shadow-primary/30 transition-all group">
                <Link to="/">
                  <Home className="mr-3 h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
                  Back to Hub
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[200px] h-14 text-lg rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <Link to="/mobile-price">
                  <Search className="mr-3 h-5 w-5" />
                  Find Gadgets
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-20">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
              Popular Destinations
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Price List", icon: "📊", href: "/mobile-price" },
                { label: "Marketplace", icon: "🛒", href: "/marketplace" },
                { label: "Stores", icon: "🏪", href: "/stores" },
                { label: "Repair Hub", icon: "🛠️", href: "/repair" },
                { label: "Sell Phone", icon: "💰", href: "/sell-your-phone" }
              ].map((item) => (
                <Link 
                  key={item.label}
                  to={item.href} 
                  className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-16 text-slate-400 dark:text-slate-600">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Previous Frequency
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
