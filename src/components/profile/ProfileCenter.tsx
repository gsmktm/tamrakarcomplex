import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Gift,
  Smartphone,
  MapPin,
  ShoppingCart,
  Wrench,
  RefreshCw,
  Eye,
  Settings,
  Activity,
  CreditCard,
} from "lucide-react";
import { ProfileOverview } from "./ProfileOverview";
import { ReferralRewardsPanel } from "./ReferralRewardsPanel";
import { PointsWalletPanel } from "./PointsWalletPanel";
import { UserDevicesPanel } from "./UserDevicesPanel";
import { AddressBookPanel } from "./AddressBookPanel";
import { PurchaseHistoryPanel } from "./PurchaseHistoryPanel";
import { RepairHistoryPanel } from "./RepairHistoryPanel";
import { ExchangeHistoryPanel } from "./ExchangeHistoryPanel";
import { ListingsHistoryPanel } from "./ListingsHistoryPanel";
import { OffersPanel } from "./OffersPanel";
import { SecurityPanel } from "./SecurityPanel";
import { ActivityTimelinePanel } from "./ActivityTimelinePanel";

export function ProfileCenter({ defaultTab = "overview" }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">My Account Center</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile, rewards, orders, and account settings in one place.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="overview" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <User className="h-4 w-4" />
            <span className="text-xs">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Gift className="h-4 w-4" />
            <span className="text-xs">Rewards</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs">Devices</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <MapPin className="h-4 w-4" />
            <span className="text-xs">Addresses</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="repairs" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Wrench className="h-4 w-4" />
            <span className="text-xs">Repairs</span>
          </TabsTrigger>
          <TabsTrigger value="exchanges" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">Exchanges</span>
          </TabsTrigger>
          <TabsTrigger value="listings" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs">Listings</span>
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Eye className="h-4 w-4" />
            <span className="text-xs">Offers</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Settings className="h-4 w-4" />
            <span className="text-xs">Security</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-col gap-1 h-16 rounded-lg data-[state=active]:bg-background">
            <Activity className="h-4 w-4" />
            <span className="text-xs">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProfileOverview />
        </TabsContent>

        <TabsContent value="rewards">
          <div className="space-y-6">
            <ReferralRewardsPanel />
            <PointsWalletPanel />
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <UserDevicesPanel />
        </TabsContent>

        <TabsContent value="addresses">
          <AddressBookPanel />
        </TabsContent>

        <TabsContent value="orders">
          <PurchaseHistoryPanel />
        </TabsContent>

        <TabsContent value="repairs">
          <RepairHistoryPanel />
        </TabsContent>

        <TabsContent value="exchanges">
          <ExchangeHistoryPanel />
        </TabsContent>

        <TabsContent value="listings">
          <ListingsHistoryPanel />
        </TabsContent>

        <TabsContent value="offers">
          <OffersPanel />
        </TabsContent>

        <TabsContent value="security">
          <SecurityPanel />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimelinePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}