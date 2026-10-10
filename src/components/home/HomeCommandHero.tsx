import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  ChevronRight,
  MapPin,
  Repeat2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Wrench,
} from "lucide-react";
import { getDiscoveryTarget, type DiscoveryScope } from "@/lib/homeDiscoveryRoutes";
import "./home-command-hero.css";

const scopes: { key: DiscoveryScope; label: string; icon: typeof Search }[] = [
  { key: "products", label: "Shop devices", icon: Smartphone },
  { key: "preowned", label: "Pre-owned", icon: Repeat2 },
];

const journeys = [
  {
    title: "Buy & compare",
    description: "Explore models and prices",
    href: "/cat/mobiles",
    icon: ShoppingBag,
    number: "01",
    className: "tc-command-tile-blue",
  },
  {
    title: "Sell or exchange",
    description: "Start a device valuation",
    href: "/sell-your-phone",
    icon: Repeat2,
    number: "02",
    className: "tc-command-tile-lime",
  },
  {
    title: "Repair & track",
    description: "Book service and follow progress",
    href: "/repair",
    icon: Wrench,
    number: "03",
    className: "tc-command-tile-amber",
  },
  {
    title: "Discover stores",
    description: "Find a nearby shop",
    href: "/stores",
    icon: Store,
    number: "04",
    className: "tc-command-tile-paper",
  },
];

const shortcuts = [
  { label: "Apple", href: "/cat/mobiles?tab=buy&brand=Apple" },
  { label: "Samsung", href: "/cat/mobiles?tab=buy&brand=Samsung" },
  { label: "Xiaomi", href: "/cat/mobiles?tab=buy&brand=Xiaomi" },
  { label: "Laptops", href: "/cat/mobiles?tab=buy&category=Laptops" },
  { label: "Used phones", href: "/marketplace" },
];

/**
 * Top-of-funnel entry point. Presentation is isolated from Supabase and admin RBAC;
 * each CTA delegates to an existing routed and permission-checked flow.
 */
export function HomeCommandHero() {
  const [scope, setScope] = useState<DiscoveryScope>("products");
  const [query, setQuery] = useState("");
  const inputId = useId();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(getDiscoveryTarget(scope, query));
  }

  return (
    <section className="tc-command-hero" aria-labelledby="tc-command-title">
      <div className="tc-command-aurora" aria-hidden="true" />
      <div className="tc-command-shell container">
        <div className="tc-command-layout">
          <div className="tc-command-copy">
            <div className="tc-command-overline">
              <span className="tc-command-mark" aria-hidden="true">TC</span>
              <span>THE NEW ROAD TECH EXCHANGE</span>
              <span className="tc-command-overline-divider" aria-hidden="true" />
              <span className="tc-command-place"><MapPin size={13} aria-hidden="true" /> Kathmandu, Nepal</span>
            </div>

            <h1 id="tc-command-title" className="tc-command-title">
              Your next device<br />
              <span>starts here.</span>
            </h1>
            <p className="tc-command-intro">
              Discover phones, compare choices, connect with local stores,
              repair your device or give it a second life. One marketplace,
              built around how Nepal shops.
            </p>

            <div className="tc-command-search-panel">
              <div className="tc-command-search-top">
                <span className="tc-command-search-label">WHAT ARE YOU LOOKING FOR?</span>
                <span className="tc-command-search-kbd">DISCOVER / 01</span>
              </div>

              <div className="tc-command-scopes" role="group" aria-label="Search category">
                {scopes.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    className={scope === key ? "tc-command-scope is-active" : "tc-command-scope"}
                    aria-pressed={scope === key}
                    onClick={() => setScope(key)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} role="search" aria-label="Find gadgets">
                <label htmlFor={inputId} className="sr-only">
                  {scope === "products" ? "Search new devices" : "Search pre-owned listings"}
                </label>
                <div className="tc-command-search-field">
                  <Search size={20} className="tc-command-input-icon" aria-hidden="true" />
                  <input
                    id={inputId}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={scope === "products" ? "Try iPhone, Galaxy or laptop..." : "Search used iPhones, laptops..."}
                    autoComplete="off"
                  />
                  <button type="submit" className="tc-command-search-button">
                    <span>{query.trim() ? "Search" : "Explore"}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>

            <div className="tc-command-shortcuts" aria-label="Popular destinations">
              <span className="tc-command-shortcut-caption">QUICK EXPLORE</span>
              {shortcuts.map((shortcut) => (
                <Link key={shortcut.label} to={shortcut.href} className="tc-command-shortcut">
                  {shortcut.label}<ChevronRight size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          <div className="tc-command-console">
            <div className="tc-command-console-head">
              <div>
                <div className="tc-command-console-eyebrow">
                  <span className="tc-command-signal" aria-hidden="true" />
                  YOUR MARKETPLACE DESK
                </div>
                <h2>What&apos;s your next move?</h2>
              </div>
              <div className="tc-command-console-symbol" aria-hidden="true">
                <ArrowUpRight size={23} />
              </div>
            </div>

            <div className="tc-command-actions">
              {journeys.map(({ title, description, href, icon: Icon, number, className }) => (
                <Link
                  key={title}
                  to={href}
                  className={"tc-command-tile " + className}
                  aria-label={title + ". " + description}
                >
                  <div className="tc-command-tile-head">
                    <span className="tc-command-tile-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className="tc-command-tile-number">{number}</span>
                  </div>
                  <div className="tc-command-tile-body">
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                  <ArrowUpRight className="tc-command-tile-arrow" size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>

            <div className="tc-command-console-bottom">
              <div className="tc-command-bottom-icon"><ShieldCheck size={18} aria-hidden="true" /></div>
              <p><strong>Choose with confidence.</strong> Review store profiles, listing details and service terms before you commit.</p>
              <Link to="/marketplace-disclosure" aria-label="Read marketplace terms"><ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>

        <div className="tc-command-footerbar">
          <div className="tc-command-footer-label"><Coins size={16} aria-hidden="true" /> Prices in NPR</div>
          <span className="tc-command-footer-separator" aria-hidden="true" />
          <div>Independent stores. More choices. Clearer decisions.</div>
          <Link to="/map">Explore the complex <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
