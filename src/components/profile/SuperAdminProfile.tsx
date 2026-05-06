import { SharedProfileSettings } from "./SharedProfileSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Database, AlertTriangle } from "lucide-react";

export default function SuperAdminProfile() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-red-500/10 p-3">
          <Shield className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Control Center</h1>
          <p className="text-muted-foreground">Global infrastructure and security oversight.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Integrity</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Secure</div>
            <p className="text-xs text-muted-foreground">All nodes operational</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Traffic</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Normal</div>
            <p className="text-xs text-muted-foreground">2.4k req/sec</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Load</CardTitle>
            <Database className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14%</div>
            <p className="text-xs text-muted-foreground">Optimal performance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SharedProfileSettings />
        
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These actions affect the entire platform. Use with extreme caution.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start text-red-600 hover:bg-red-50">
                Initiate Platform Maintenance Mode
              </Button>
              <Button variant="outline" className="justify-start text-red-600 hover:bg-red-50">
                Flush Global Cache
              </Button>
              <Button variant="outline" className="justify-start text-red-600 hover:bg-red-50">
                Download Full System Audit Log
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
