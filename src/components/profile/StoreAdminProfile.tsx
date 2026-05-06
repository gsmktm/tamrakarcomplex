import { SharedProfileSettings } from "./SharedProfileSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, TrendingUp, Package, Users } from "lucide-react";

export default function StoreAdminProfile() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-green-500/10 p-3">
          <Store className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Merchant Account</h1>
          <p className="text-muted-foreground">Manage your personal admin profile and store association.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8 / 5.0</div>
            <p className="text-xs text-muted-foreground">Top 10% of merchants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Inventory</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">12 items low stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">3 staff, 2 admins</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SharedProfileSettings />
        
        <Card>
          <CardHeader>
            <CardTitle>Merchant Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-green-700">Fully Verified</span>
                </div>
                <span className="text-xs text-green-600 font-medium uppercase">Active</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Verification Documents:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Business Registration (Verified 2024-01-15)</li>
                  <li>✓ Tax ID / VAT (Verified 2024-01-16)</li>
                  <li>✓ ID Verification (Verified 2024-01-10)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
