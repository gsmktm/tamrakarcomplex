import { CampaignBanner } from "@/components/campaigns/CampaignBanner";

/** Compatibility facade: promotions are exclusively admin-approved campaigns. */
export const HomeOffers = () => <CampaignBanner placement="home_mid" variant="feature" />;
