import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeText } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Shield, Bell, LogOut, Trash2, Smartphone } from "lucide-react";
import { toast } from "sonner";

export function SecurityPanel() {
  const { user, signOut } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingPassword) return;
    if (!user) {
      toast.error("Please sign in to update your password.");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Use a password of at least 8 characters.");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("Choose a password different from your current one.");
      return;
    }
    setUpdatingPassword(true);
    try {
      // Supabase Auth verifies the supplied current password server-side.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (error) throw error;
      toast.success("Your account password was updated.");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOutOtherSessions = async () => {
    if (!user || signingOutOthers) return;
    setSigningOutOthers(true);
    try {
      // 'others' revokes other refresh tokens without signing out this device.
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Other sessions revoked. Existing access tokens may remain valid until expiration.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke other sessions.");
    } finally {
      setSigningOutOthers(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security & Account</h2>
        <p className="text-muted-foreground">Manage your password, sessions, and account settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password & Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Input value={user?.email} disabled />
                <Badge variant="secondary">{user?.email_confirmed_at ? "Verified" : "Unverified"}</Badge>
              </div>
            </div>

            <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input
                      id="current"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">New Password</Label>
                    <Input
                      id="new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updatingPassword}>
                      {updatingPassword ? "Updating password…" : "Update Password"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Active Sessions</Label>
              <div className="text-sm text-muted-foreground">
                Currently signed in on this device
              </div>
              <Button variant="outline" onClick={() => void handleSignOutOtherSessions()} disabled={signingOutOthers}>
                {signingOutOthers ? "Revoking sessions…" : "Sign Out Other Sessions"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Two-Factor Authentication</Label>
              <div className="text-sm text-muted-foreground">
                Not enabled
              </div>
              <Button variant="outline" disabled>
                Enable 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Notifications</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Order Updates</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email</span>
                <div className="flex items-center gap-2">
                  <Input value={safeText(user?.email)} disabled />
                  <Badge variant="secondary">Verified</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delete Account</Label>
              <div className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </div>
              <Button variant="destructive" disabled>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Recent Login Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Current Session</div>
                  <div className="text-sm text-muted-foreground">This browser session • Device and location details not tracked here</div>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}