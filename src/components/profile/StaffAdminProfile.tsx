import { SharedProfileSettings } from "./SharedProfileSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, ListTodo, Shield } from "lucide-react";

export default function StaffAdminProfile() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-blue-500/10 p-3">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Operations Center</h1>
          <p className="text-muted-foreground">Manage your platform tasks and operational access.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 urgent pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (Week)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2h</div>
            <p className="text-xs text-muted-foreground">Within target SLA</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SharedProfileSettings />
        
        <Card>
          <CardHeader>
            <CardTitle>My Module Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { module: "User Management", level: "Full Access" },
                { module: "Store Verification", level: "Review Only" },
                { module: "Content Moderation", level: "Full Access" },
                { module: "Repair Oversight", level: "View Only" },
              ].map((item) => (
                <div key={item.module} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="font-medium text-sm">{item.module}</span>
                  <span className="text-xs bg-secondary px-2 py-1 rounded-full">{item.level}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4 italic">
                Contact Super Admin to request additional module permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
