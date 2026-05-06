import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

const BRANDS = [
  { name: "Apple", logo: "🍎" },
  { name: "Samsung", logo: "📱" },
  { name: "Xiaomi", logo: "🟠" },
  { name: "Realme", logo: "🟡" },
  { name: "OnePlus", logo: "🔴" },
  { name: "Vivo", logo: "🔵" },
  { name: "Oppo", logo: "🟢" },
  { name: "Nokia", logo: "🟦" },
  { name: "Honor", logo: "⚪" },
  { name: "Google", logo: "🌈" },
  { name: "Nothing", logo: "⬛" },
  { name: "Infinix", logo: "🟩" },
  { name: "Tecno", logo: "🔲" },
  { name: "Benco", logo: "💠" },
  { name: "Motorola", logo: "Ⓜ️" },
  { name: "ZTE", logo: "📡" },
];

export default function Brands() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Mobile Brands in Nepal | Tamrakar Complex"
        description="Browse all mobile phone brands available in Tamrakar Complex. View latest prices and models."
        url="/brands"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">Mobile Brands</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore the latest smartphones and devices from top global and local brands available at Tamrakar Complex.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {BRANDS.map((brand) => (
            <Link 
              key={brand.name} 
              to={`/mobile-price/brand/${brand.name.toLowerCase()}`}
              className="group"
            >
              <Card className="hover:shadow-md transition-shadow duration-300 border-2 hover:border-primary/20">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {brand.logo}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{brand.name}</h3>
                  <div className="flex items-center text-sm text-primary font-medium">
                    View Prices <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
