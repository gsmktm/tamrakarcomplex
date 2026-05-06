import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Activity } from "lucide-react";

export default function StoreSecurity() {
  const { user } = useAuth();

  const { data: securityData, isLoading } = useQuery({
    queryKey: ["store-security", user?.id],
    queryFn: async () => {
      // Placeholder for security logs - assuming future audit_logs table
      const { data: staff, error: staffError } = await supabase
        .from("store_admins")
        .select("*")
        .eq("store_id", user?.id);

      if (staffError) throw staffError;

      return {
        staff: staff || [],
        recentActivities: [], // Placeholder
        loginEvents: [], // Placeholder
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading security info...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Store Security</h1>
        <p className="text-muted-foreground">Monitor access and security events</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityData?.staff?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between">
                  <span>{member.role}</span>
                  <Badge variant="secondary">{member.status || "active"}</Badge>
                </div>
              )) || <p>No staff members</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activities</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}