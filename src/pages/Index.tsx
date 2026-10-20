import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EcommerceHomeSection } from "@/components/sections/EcommerceHomeSection";
import { SEO } from "@/components/common/SEO";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col tc26-shell">
      <SEO
        title="Tamrakar Complex | Nepal's Tech Marketplace"
        description="Explore phones and electronics, published shop profiles, device comparison, exchange, and repair services at Tamrakar Complex, New Road, Kathmandu."
        url="/"
        keywords={["gadget Nepal", "buy sell exchange repair", "mobile price Nepal", "Tamrakar Complex"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tamrakar Complex",
          url: "https://tamrakarcomplex.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://tamrakarcomplex.com/buy?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />
      
      <main id="main-content" className="flex-1">
        <EcommerceHomeSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
