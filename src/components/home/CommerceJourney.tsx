import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Wrench,
} from "lucide-react";

/**
 * Connected, accessible entry points into existing marketplace journeys.
 * This component never creates transactions; every action goes to a
 * dedicated workflow that owns validation and persistence.
 */
const journeys = [
  {
    id: "buy",
    label: "Buy a device",
    eyebrow: "01 / DISCOVER",
    title: "Find the right device. Know the seller.",
    description: "Search phones and accessories, compare available listings, and review the seller before making a purchase.",
    icon: ShoppingBag,
    highlights: [
      { title: "Find", detail: "Search models, storage, and price ranges", icon: Search },
      { title: "Compare", detail: "Review options and seller information", icon: ClipboardCheck },
      { title: "Checkout", detail: "Confirm the final price, delivery, and payment", icon: ShieldCheck },
    ],
    primary: { label: "Explore devices", href: "/buy" },
    secondary: { label: "Compare prices", href: "/mobile-price" },
    note: "Stock, warranties, delivery terms, and payment options depend on the listing and store.",
  },
  {
    id: "sell",
    label: "Sell or exchange",
    eyebrow: "02 / UPGRADE",
    title: "Your current phone has a next chapter.",
    description: "Review an estimated device value, submit an accurate condition report, and explore resale or exchange options.",
    icon: RefreshCw,
    highlights: [
      { title: "Estimate", detail: "Choose your model and condition", icon: ClipboardCheck },
      { title: "Submit", detail: "Share the device details for evaluation", icon: Search },
      { title: "Review", detail: "Confirm the final offer before proceeding", icon: BadgeCheck },
    ],
    primary: { label: "Sell your phone", href: "/sell-your-phone" },
    secondary: { label: "Exchange a device", href: "/exchange-your-phone" },
    note: "Estimates are not guaranteed payouts. Final offers depend on physical checks and buyer terms.",
  },
  {
    id: "repair",
    label: "Book a repair",
    eyebrow: "03 / RESTORE",
    title: "Keep great technology in use for longer.",
    description: "Describe the problem, explore repair options, and use a booking workflow to request service.",
    icon: Wrench,
    highlights: [
      { title: "Diagnose", detail: "Describe the fault and device model", icon: Search },
      { title: "Book", detail: "Submit a repair enquiry or appointment", icon: ClipboardCheck },
      { title: "Track", detail: "Follow the repair request in your account", icon: ShieldCheck },
    ],
    primary: { label: "Explore repairs", href: "/repair" },
    secondary: { label: "Track requests", href: "/user/history" },
    note: "Repair fees, turnaround times, and parts availability require confirmation by the service provider.",
  },
  {
    id: "stores",
    label: "Find a store",
    eyebrow: "04 / CONNECT",
    title: "Discover the people behind the marketplace.",
    description: "Browse the store directory, inspect published details, and contact a shop directly about a product or service.",
    icon: Store,
    highlights: [
      { title: "Discover", detail: "Explore shops in the directory", icon: MapPin },
      { title: "Verify", detail: "Review available store profile information", icon: BadgeCheck },
      { title: "Connect", detail: "Ask the store about stock and fulfilment", icon: ArrowRight },
    ],
    primary: { label: "Browse stores", href: "/stores" },
    secondary: { label: "Register a store", href: "/store/apply" },
    note: "Store profiles and verification indicators reflect available platform records, not an independent guarantee.",
  },
] as const;

export function CommerceJourney() {
  const [selected, setSelected] = useState<(typeof journeys)[number]["id"]>("buy");
  const active = journeys.find((journey) => journey.id === selected) ?? journeys[0];

  return (
    <section className="tc-journey" aria-labelledby="tc-journey-title">
      <div className="container">
        <header className="tc-journey-heading">
          <div>
            <span className="tc-journey-eyebrow">TAMRAKAR / THE CONNECTED EXPERIENCE</span>
            <h2 id="tc-journey-title">One destination. Every device journey.</h2>
            <p>Buy, sell, repair, or connect with stores — choose your next step.</p>
          </div>
          <span className="tc-journey-mark" aria-hidden="true">TC<span>®</span></span>
        </header>

        <div className="tc-journey-tabs" role="tablist" aria-label="Choose a marketplace journey">
          {journeys.map((journey) => {
            const Icon = journey.icon;
            const isActive = journey.id === active.id;
            return (
              <button
                type="button"
                key={journey.id}
                id={"tc-tab-" + journey.id}
                role="tab"
                aria-selected={isActive}
                aria-controls="tc-journey-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setSelected(journey.id)}
                onKeyDown={(event) => {
                  const index = journeys.findIndex((item) => item.id === selected);
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    const delta = event.key === "ArrowRight" ? 1 : -1;
                    const next = journeys[(index + delta + journeys.length) % journeys.length];
                    setSelected(next.id);
                    document.getElementById("tc-tab-" + next.id)?.focus();
                  }
                }}
                className={isActive ? "tc-journey-tab is-active" : "tc-journey-tab"}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{journey.label}</span>
                <ArrowRight size={15} className="tc-journey-tab-arrow" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div
          id="tc-journey-panel"
          role="tabpanel"
          aria-labelledby={"tc-tab-" + active.id}
          tabIndex={0}
          className="tc-journey-panel"
        >
          <div className="tc-journey-intro">
            <span className="tc-journey-eyebrow">{active.eyebrow}</span>
            <h3>{active.title}</h3>
            <p>{active.description}</p>
            <div className="tc-journey-actions">
              <Link className="tc-journey-primary" to={active.primary.href}>
                {active.primary.label} <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="tc-journey-secondary" to={active.secondary.href}>
                {active.secondary.label} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="tc-journey-flow" aria-label={active.label + " steps"}>
            {active.highlights.map((step, index) => {
              const Icon = step.icon;
              return (
                <div className="tc-journey-step" key={step.title}>
                  <div className="tc-journey-step-icon">
                    <Icon size={19} aria-hidden="true" />
                  </div>
                  <div className="tc-journey-step-copy">
                    <span>STEP {String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="tc-journey-disclosure">
          <ShieldCheck size={16} aria-hidden="true" />
          {active.note}
        </p>
      </div>
    </section>
  );
}
