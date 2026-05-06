import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Tag, Percent } from "lucide-react";

export function OffersPanel() {
  // Placeholder for offers/coupons
  const offers = [
    {
      id: 1,
      title: "Welcome Bonus",
      description: "10% off your first repair",
      type: "discount",
      validUntil: "2026-12-31",
      claimed: false,
    },
    {
      id: 2,
      title: "Referral Reward",
      description: "Free screen replacement on 5 successful referrals",
      type: "reward",
      validUntil: "2026-12-31",
      claimed: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Offers & Rewards</h2>
        <p className="text-muted-foreground">Available coupons, discounts, and special offers</p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No offers available</h3>
            <p className="text-sm text-muted-foreground text-center">
              Check back later for special offers and rewards
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {offer.type === "discount" ? (
                    <Percent className="h-5 w-5 text-green-500" />
                  ) : (
                    <Gift className="h-5 w-5 text-purple-500" />
                  )}
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {offer.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Valid until {offer.validUntil}</Badge>
                  <Button size="sm" disabled={offer.claimed}>
                    {offer.claimed ? "Claimed" : "Claim"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}