import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EcommerceHomeSection } from "@/components/sections/EcommerceHomeSection";
import { SEO } from "@/components/common/SEO";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Tamrakar Complex - Nepal’s Digital Mobile Hub"
        description="Explore phones, compare prices, find local shops, sell or exchange devices, and book repairs at Tamrakar Complex, New Road, Kathmandu."
        url="/"
        keywords={["gadget Nepal", "buy sell exchange repair", "mobile price Nepal", "Tamrakar Complex"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tamrakar Complex",
          url: "https://tamrakarcomplex.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://tamrakarcomplex.com/cat/mobiles?tab=buy&q={search_term_string}",
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
