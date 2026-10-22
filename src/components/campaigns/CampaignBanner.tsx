import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Gift, Sparkles } from "lucide-react";
import {
  isCampaignRunning, safeCampaignImage, safeCampaignPath,
  useCampaignPlacement, type CampaignPlacement, type MarketingCampaign,
} from "@/hooks/useCampaignPlacement";
import "./CampaignBanner.css";

type Props = { placement: CampaignPlacement; variant?: "feature" | "strip" | "compact"; limit?: number };

function CampaignCard({ campaign, variant }: { campaign: MarketingCampaign; variant: NonNullable<Props["variant"]> }) {
  const destination = safeCampaignPath(campaign.link_url);
  const artwork = safeCampaignImage(campaign.image_url);
  const isFestival = Boolean(campaign.festival_key);
  const content = (
    <div className={"tc-campaign tc-campaign--" + variant + (isFestival ? " tc-campaign--festival" : "")}>
      {artwork && <img src={artwork} alt="" loading="lazy" decoding="async" className="tc-campaign__art" />}
      <div className="tc-campaign__overlay" aria-hidden="true" />
      <div className="tc-campaign__body">
        <span className="tc-campaign__eyebrow">
          {isFestival ? <Gift size={15} aria-hidden /> : <Sparkles size={15} aria-hidden />}
          {campaign.disclosure || (campaign.is_sponsored ? "Sponsored promotion" : "Featured promotion")}
        </span>
        <h3>{campaign.title}</h3>
        {campaign.subtitle && <p>{campaign.subtitle}</p>}
        {destination && <span className="tc-campaign__cta">{campaign.button_text?.trim() || "Explore collection"} <ArrowRight size={16} aria-hidden /></span>}
      </div>
      <span className="tc-campaign__decoration" aria-hidden="true">{isFestival ? "✦" : "◇"}</span>
    </div>
  );
  return destination ? (
    <Link className="tc-campaign__link" to={destination} aria-label={campaign.title + " — " + (campaign.disclosure || "Promotion")}>{content}</Link>
  ) : <div className="tc-campaign__link">{content}</div>;
}

/** Zero UI when no approved campaigns. No fake festival discounts or invented inventory. */
export function CampaignBanner({ placement, variant = "strip", limit = 2 }: Props) {
  const { data: campaigns = [] } = useCampaignPlacement(placement);
  const [now] = useState(() => Date.now());
  // React Query refreshes the banners each minute; schedule changes are enforced by RLS.
  const visible = campaigns.filter((campaign) => isCampaignRunning(campaign, Date.now() || now)).slice(0, limit);
  if (visible.length === 0) return null;
  return (
    <section className="tc-campaign-section" aria-label="Current promotions">
      <div className={variant === "compact" ? "tc-campaign-grid tc-campaign-grid--compact" : "tc-campaign-grid"}>
        {visible.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} variant={variant} />)}
      </div>
    </section>
  );
}
