import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BadgeCheck, ChevronRight, CircleHelp, Headphones, Laptop,
  MapPin, MonitorSmartphone, Search, ShieldCheck, ShoppingBag, Smartphone,
  Sparkles, Store, Tablet, Watch, Wrench, RefreshCw, Zap, PackageCheck,
  ScanSearch, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStorePreview } from "@/hooks/useStorePreview";
import type { Product } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { SafeImage } from "@/components/common/SafeImage";
import { getPublicStorePath } from "@/lib/storeRoutes";
import heroPhone from "@/assets/hero-phone.jpg";
import "@/styles/homepage-2026.css";

// Curated navigation labels, never fabricated inventory or prices.
const categories = [
  { title: "Smartphones", note: "iPhone, Galaxy & more", href: "/cat/mobiles", icon: Smartphone, tone: "orange" },
  { title: "Laptops", note: "Work, study & play", href: "/laptop-price", icon: Laptop, tone: "blue" },
  { title: "Tablets", note: "iPad & Android", href: "/buy?category=Tablets", icon: Tablet, tone: "violet" },
  { title: "Wearables", note: "Watches & fitness", href: "/buy?category=Smartwatches", icon: Watch, tone: "mint" },
  { title: "Accessories", note: "Audio, power & more", href: "/buy?category=Accessories", icon: Headphones, tone: "peach" },
  { title: "Repairs", note: "Screen, battery & care", href: "/repair", icon: Wrench, tone: "slate" },
];

const brands = ["Apple", "Samsung", "Xiaomi", "OnePlus", "Nothing", "Vivo", "OPPO", "Realme"];

const benefits = [
  { icon: Store, title: "Discover local shops", note: "Explore published store profiles." },
  { icon: RefreshCw, title: "Sell & exchange", note: "See your device upgrade options." },
  { icon: Wrench, title: "Repair assistance", note: "Find repair services and request help." },
  { icon: ShieldCheck, title: "Shop with clarity", note: "Check listings and terms before buying." },
];

function Headline({ eyebrow, title, note, href, action }: {
  eyebrow: string; title: string; note?: string; href?: string; action?: string;
}) {
  return (
    <div className="tc26-section-heading">
      <div>
        <span className="tc26-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {href && <Link to={href} className="tc26-text-link">{action || "Explore all"} <ArrowRight size={17} aria-hidden /></Link>}
    </div>
  );
}

export function PremiumHomepage2026() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Live data only: do not present sample product records as available stock.
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery<Product[]>({
    queryKey: ["premium-homepage-2026", "available-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,brand,price,price_value,image,images,rating,category,in_stock,featured,specs")
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: stores = [], isLoading: storesLoading, isError: storesError } = useStorePreview(3);

  const visibleProducts = (activeCategory === "All"
    ? products
    : products.filter((product) => {
        const category = product.category?.toLowerCase() || "";
        if (activeCategory === "Smartphones") return /phone|mobile/.test(category);
        if (activeCategory === "Laptops") return /laptop|notebook|macbook/.test(category);
        if (activeCategory === "Tablets") return /tablet|ipad/.test(category);
        return /audio|earbud|watch|accessor|headphone/.test(category);
      })
  ).slice(0, 6);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) navigate("/buy?q=" + encodeURIComponent(term));
  };

  return (
    <div className="tc26" data-testid="premium-homepage">
      <section className="tc26-hero" aria-labelledby="tc26-hero-title">
        <div className="tc26-hero-light" aria-hidden="true" />
        <div className="tc26-container tc26-hero-inner">
          <div className="tc26-hero-content">
            <span className="tc26-overline"><Sparkles size={14} aria-hidden /> NEW ROAD · KATHMANDU · NEPAL</span>
            <h1 id="tc26-hero-title">Your Tech.<br /><em>Your Marketplace.</em></h1>
            <p>Shop, compare, trade and repair with local stores — all in one connected technology marketplace.</p>
            <form className="tc26-hero-search" onSubmit={search} role="search">
              <Search size={20} aria-hidden />
              <label htmlFor="tc26-search" className="sr-only">Search devices</label>
              <input id="tc26-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search phones, laptops, accessories…" />
              <button type="submit" aria-label="Search marketplace"><ArrowRight size={19} /></button>
            </form>
            <div className="tc26-hero-actions">
              <Link to="/buy" className="tc26-button tc26-button-orange">Explore devices <ArrowRight size={18} aria-hidden /></Link>
              <Link to="/stores" className="tc26-button tc26-button-ghost"><MapPin size={18} aria-hidden /> Find a store</Link>
            </div>
            <div className="tc26-hero-caption"><span className="tc26-status-dot" /> From New Road to a smarter tomorrow.</div>
          </div>
          <div className="tc26-hero-visual" aria-hidden="true">
            <div className="tc26-glow-orbit" />
            <div className="tc26-glow-orbit second" />
            <div className="tc26-mountains" />
            <div className="tc26-device-panel tc26-device-left"><MonitorSmartphone size={96} strokeWidth={0.6} /></div>
            <div className="tc26-device-panel tc26-device-right"><Headphones size={95} strokeWidth={0.75} /></div>
            <div className="tc26-device-main">
              <img src={heroPhone} alt="" loading="eager" />
            </div>
            <span className="tc26-hero-postertext">MORE<br />THAN<br /><i>PHONES.</i></span>
          </div>
        </div>
        <div className="tc26-container tc26-hero-benefits">
          {benefits.map(({ icon: Icon, title, note }) => (
            <div key={title} className="tc26-hero-benefit">
              <Icon size={23} strokeWidth={1.7} aria-hidden />
              <span><strong>{title}</strong><small>{note}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section className="tc26-container tc26-categories" aria-label="Shop by category">
        <div className="tc26-category-grid">
          {categories.map(({ title, note, href, icon: Icon, tone }) => (
            <Link to={href} key={title} className={"tc26-category tc26-tone-" + tone}>
              <span className="tc26-category-art"><Icon size={46} strokeWidth={1.35} aria-hidden /></span>
              <span className="tc26-category-copy"><strong>{title}</strong><small>{note}</small></span>
              <ChevronRight className="tc26-category-arrow" size={19} aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className="tc26-container tc26-brands" aria-label="Explore technology brands">
        <Headline eyebrow="THE BRANDS YOU KNOW" title="Find your favorite brand" href="/brands" action="View all brands" />
        <div className="tc26-brand-grid">
          {brands.map((brand) => (
            <Link key={brand} to={"/buy?brand=" + encodeURIComponent(brand)} className="tc26-brand">
              {brand}<ArrowRight size={14} aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className="tc26-container tc26-products" aria-label="Discover trending devices">
        <Headline eyebrow="EXPLORE THE CATALOG" title="Discover trending devices" note="Browse available catalog items; prices and availability come from current listings." href="/buy" action="All products" />
        <div className="tc26-tabs" role="group" aria-label="Filter products by category">
          {["All", "Smartphones", "Laptops", "Tablets", "Accessories"].map((label) => (
            <button key={label} type="button" onClick={() => setActiveCategory(label)} className={activeCategory === label ? "is-active" : ""} aria-pressed={activeCategory === label}>{label}</button>
          ))}
        </div>
        {productsLoading ? (
          <div className="tc26-products-grid" aria-label="Loading products">
            {Array.from({ length: 6 }).map((_, i) => <div className="tc26-product-skeleton" key={i} />)}
          </div>
        ) : visibleProducts.length ? (
          <div className="tc26-products-grid">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="tc26-empty"><ScanSearch size={30} aria-hidden /><strong>{productsError ? "Products are temporarily unavailable" : "No matching products right now"}</strong><p>Browse the full catalog or choose a different category.</p><Link to="/buy">Browse catalog <ArrowRight size={16} /></Link></div>
        )}
      </section>

      <section className="tc26-container tc26-store-section" aria-label="Discover local electronics stores">
        <Headline eyebrow="PEOPLE BEHIND THE PRODUCTS" title="Discover stores at Tamrakar Complex" note="Connect directly with shops and specialists in New Road, Kathmandu." href="/stores" action="View store directory" />
        {storesLoading ? (
          <div className="tc26-store-grid">{[0,1,2].map((i)=><div key={i} className="tc26-store-skeleton" />)}</div>
        ) : stores.length ? (
          <div className="tc26-store-grid">
            {stores.map((store) => (
              <Link key={store.id} to={getPublicStorePath(store)} className="tc26-store-card">
                <div className="tc26-store-cover">
                  {store.logo_url ? <SafeImage src={store.logo_url} alt={store.name + " logo"} className="tc26-store-logo" /> : <Store size={52} strokeWidth={1.1} aria-hidden />}
                  <span className="tc26-store-pill"><MapPin size={12} aria-hidden /> New Road</span>
                </div>
                <div className="tc26-store-details">
                  <div><h3>{store.name}</h3><p>{store.location || "Tamrakar Complex, Kathmandu"}</p>{store.is_verified && <span className="tc26-verified"><BadgeCheck size={14} /> Verified profile</span>}</div>
                  <span className="tc26-store-open" aria-hidden><ArrowRight size={19} /></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="tc26-empty"><Store size={30} aria-hidden /><strong>{storesError ? "Store directory is temporarily unavailable" : "No published stores to display yet"}</strong><p>Explore the store directory for more information.</p><Link to="/stores">Browse stores <ArrowRight size={16} /></Link></div>
        )}
      </section>

      <section className="tc26-container tc26-service-promos" aria-label="Trade in and repair services">
        <article className="tc26-promo tc26-promo-exchange">
          <div className="tc26-promo-art"><RefreshCw size={138} strokeWidth={0.75} aria-hidden /></div>
          <div><span className="tc26-promo-eyebrow"><Zap size={15} aria-hidden /> UPGRADE SMARTER</span><h2>Trade in.<br />Move up.</h2><p>Explore your device resale or exchange options before upgrading.</p><Link to="/sell-your-phone?mode=exchange" className="tc26-button tc26-button-white">Explore exchange <ArrowRight size={18} /></Link></div>
        </article>
        <article className="tc26-promo tc26-promo-repair">
          <div className="tc26-promo-art"><Wrench size={145} strokeWidth={0.7} aria-hidden /></div>
          <div><span className="tc26-promo-eyebrow"><ShieldCheck size={15} aria-hidden /> DEVICE CARE</span><h2>Repair with<br />confidence.</h2><p>Find service options for screens, batteries, and device troubleshooting.</p><Link to="/repair" className="tc26-button tc26-button-white">Find repair services <ArrowRight size={18} /></Link></div>
        </article>
      </section>

      <section className="tc26-container tc26-prebook">
        <div className="tc26-prebook-symbol"><Smartphone size={108} strokeWidth={0.8} aria-hidden /></div>
        <div className="tc26-prebook-text"><span className="tc26-eyebrow">PLAN WHAT'S NEXT</span><h2>Discover your next device.</h2><p>Compare upcoming and current gadgets, then contact stores for availability and booking options.</p></div>
        <Link to="/buy" className="tc26-button tc26-button-orange">Browse devices <ArrowRight size={17} /></Link>
      </section>

      <section className="tc26-container tc26-how">
        <Headline eyebrow="SIMPLE BY DESIGN" title="How Tamrakar Complex works" note="Find the right product, connect with a store, and choose the service you need." />
        <div className="tc26-how-grid">
          {[
            { icon: ScanSearch, number: "01", name: "Discover", body: "Explore product information, brands, and store listings.", href: "/buy" },
            { icon: Store, number: "02", name: "Connect", body: "Contact the shop to confirm prices, stock, and details.", href: "/stores" },
            { icon: ShoppingBag, number: "03", name: "Shop or book", body: "Continue with a purchase, an exchange inquiry, or a repair.", href: "/services" },
          ].map(({ icon: Icon, number, name, body, href }) => (
            <Link key={number} to={href} className="tc26-how-card"><span className="tc26-how-icon"><Icon size={29} strokeWidth={1.6} aria-hidden /></span><span className="tc26-how-number">{number}</span><strong>{name}</strong><p>{body}</p><ArrowRight className="tc26-how-arrow" size={18} aria-hidden /></Link>
          ))}
        </div>
      </section>

      <section className="tc26-container tc26-reassure" aria-label="Why choose Tamrakar Complex">
        {[
          { icon: BadgeCheck, text: "Local store discovery", note: "Profiles & details" },
          { icon: CircleHelp, text: "Clear information", note: "Compare before buying" },
          { icon: PackageCheck, text: "Device services", note: "Sell, exchange & repair" },
          { icon: CheckCircle2, text: "Easy browsing", note: "Built for mobile & desktop" },
        ].map(({ icon: Icon, text, note }) => <div className="tc26-reassure-item" key={text}><Icon size={25} strokeWidth={1.6} aria-hidden /><span><strong>{text}</strong><small>{note}</small></span></div>)}
      </section>
    </div>
  );
}
