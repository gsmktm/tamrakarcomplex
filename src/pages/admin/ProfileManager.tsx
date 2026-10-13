import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { USER_DEVICES_COLUMNS, ORDERS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  Activity,
  Bell,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRepairDashboard } from "@/components/repair/UserRepairDashboard";
import { ActivityTimelinePanel } from "@/components/profile/ActivityTimelinePanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn, getErrorMessage, safeText } from "@/lib/utils";
import { normalizeRole } from "@/lib/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AppRole } from "@/types/app";

type ProfileFormState = {
  display_name: string;
  bio: string;
  avatar_url: string;
  phone: string;
  location: string;
};

function getInitials(nameOrEmail: unknown) {
  const safe = safeText(nameOrEmail, "User");
  const parts = safe.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function ProfileManager() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProfileFormState>({
    display_name: "",
    bio: "",
    avatar_url: "",
    phone: "",
    location: "",
  });
  const initialRef = useRef<ProfileFormState | null>(null);

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const { data: profileRow, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url, phone, location, referral_code, referred_by, referral_count")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as
        | {
            display_name: string | null;
            bio: string | null;
            avatar_url: string | null;
            phone?: string | null;
            location?: string | null;
            referral_code: string | null;
            referred_by: string | null;
            referral_count: number;
          }
        | null;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!profileRow) return;
    const next: ProfileFormState = {
      display_name: profileRow.display_name ?? "",
      bio: profileRow.bio ?? "",
      avatar_url: profileRow.avatar_url ?? "",
      phone: profileRow.phone ?? "",
      location: profileRow.location ?? "",
    };
    setForm(next);
    initialRef.current = next;
  }, [profileRow]);

  useEffect(() => {
    // Load notification preferences from localStorage (UI only)
    try {
      const stored = localStorage.getItem("profile-notify");
      if (!stored) return;
      const parsed = JSON.parse(stored) as { notifyEmail?: boolean; notifyPush?: boolean };
      setNotifyEmail(parsed.notifyEmail ?? true);
      setNotifyPush(parsed.notifyPush ?? false);
    } catch {
      // ignore
    }
  }, []);

  const isDirty = useMemo(() => {
    const initial = initialRef.current;
    if (!initial) {
      return Object.values(form).some((v) => v.trim() !== "");
    }
    return (
      form.display_name !== initial.display_name ||
      form.bio !== initial.bio ||
      form.avatar_url !== initial.avatar_url ||
      form.phone !== initial.phone ||
      form.location !== initial.location
    );
  }, [form]);

  const completion = useMemo(() => {
    const missing: string[] = [];
    if (!form.display_name.trim()) missing.push("Display name");
    if (!form.phone.trim()) missing.push("Phone");
    if (!form.location.trim()) missing.push("Location");
    if (!form.avatar_url.trim()) missing.push("Avatar");
    if (!form.bio.trim()) missing.push("Bio");
    const total = 5;
    const pct = Math.round(((total - missing.length) / total) * 100);
    return { pct, missing };
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not logged in");
      const updates = {
        user_id: user.id,
        display_name: form.display_name.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("profiles").upsert(updates, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile saved.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to save profile.")),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPwd(false);
      setShowConfirmPwd(false);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to change password.")),
  });

  const changeEmailMutation = useMutation({
    mutationFn: async () => {
      const next = newEmail.trim();
      if (!next) throw new Error("Enter an email address.");
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email update requested. Check your inbox to confirm the change.");
      setNewEmail("");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update email.")),
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not logged in");
      const fileExt = file.name.split(".").pop() || "png";
      const safeExt = fileExt.replace(/[^a-zA-Z0-9]/g, "") || "png";
      const filePath = `${user.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error("Could not get uploaded avatar URL.");
      return data.publicUrl;
    },
    onSuccess: (publicUrl: string) => {
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar uploaded.");
    },
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, "Failed to upload avatar. Ensure the 'avatars' bucket exists.")),
  });

  const { data: myRoles } = useQuery<AppRole[]>({
    queryKey: ["my-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((r) => normalizeRole(r.role));
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not logged in");
      const metadata =
        user?.user_metadata && typeof user.user_metadata === "object"
          ? (user.user_metadata as Record<string, unknown>)
          : {};
      await supabase.from("contact_messages").insert({
        name: safeText(form.display_name) || safeText(metadata.full_name) || "User",
        email: user?.email || null,
        subject: "account:delete",
        message: JSON.stringify({ user_id: user?.id, phone: form.phone, location: form.location }),
      });
    },
    onSuccess: () => toast.success("Deletion request submitted. An admin will process it within 48 hours."),
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to submit deletion request.")),
  });

  const exportData = async () => {
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        user: {
          id: user?.id ?? null,
          email: user?.email ?? null,
        },
        profile: { ...form },
        roles: myRoles ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tamrakar-account-export-${user?.id ?? "unknown"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to export data."));
    }
  };

  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const displayName =
    safeText(form.display_name) ||
    safeText(metadata.full_name) ||
    safeText(metadata.name) ||
    safeText(user?.email) ||
    "User";
  const initials = getInitials(displayName);
  const roles = (myRoles || []).length ? (myRoles || []) : (user ? (["public_user"] as AppRole[]) : []);

  // Fetch histories
  const { data: devices } = useQuery({
    queryKey: ["user-devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_devices").select(USER_DEVICES_COLUMNS.join(",")).eq("user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: exchanges } = useQuery({
    queryKey: ["user-exchanges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("exchange_requests").select("*, old_device:user_devices(*)").eq("user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: orders } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select(ORDERS_COLUMNS.join(",")).eq("user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const referralCode = safeText(profileRow?.referral_code);
  const referralLink = referralCode
    ? `${window.location.origin}/auth?mode=signup&ref=${encodeURIComponent(referralCode)}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Please sign in to manage your profile.</CardContent>
      </Card>
    );
  }

  const signOutEverywhere = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" } as never);
    } catch {
      // ignore and fall back to local sign out
    }
    await signOut();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border">
                  <AvatarImage src={safeText(form.avatar_url) || undefined} alt={displayName} />
                  <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      avatarUploadMutation.mutate(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0">
                <div className="text-2xl font-bold tracking-tight">{displayName}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <Badge key={r} variant={r === "suadmin" || r === "staffadmin" ? "default" : "outline"}>
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Profile completion</span>
                  <span className="font-medium text-foreground">{completion.pct}%</span>
                </div>
                <Progress value={completion.pct} className="h-2" />
                {completion.missing.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Missing: <span className="text-foreground">{completion.missing.join(", ")}</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">All set.</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(user.id);
                      toast.success("User ID copied.");
                    } catch (error: unknown) {
                      toast.error(getErrorMessage(error, "Could not copy."));
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy User ID
                </Button>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(
              [
                { to: ".", label: "Profile", icon: UserIcon, end: true },
                { to: "security", label: "Security", icon: Shield },
                { to: "preferences", label: "Preferences", icon: Bell },
                { to: "activity", label: "Activity", icon: Activity },
                { to: "danger", label: "Danger Zone", icon: AlertTriangle },
              ] as Array<{ to: string; label: string; icon: typeof UserIcon; end?: boolean }>
            ).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {profileLoading ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading account…
              </CardContent>
            </Card>
          ) : (
            <Routes>
              <Route
                index
                element={
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Edit Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name</Label>
                            <Input
                              id="display_name"
                              value={form.display_name}
                              onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                              placeholder="Your name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={form.phone}
                              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                              placeholder="+977 98XXXXXXXX"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              value={form.location}
                              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                              placeholder="Kathmandu, Nepal"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="avatar_url">Avatar URL</Label>
                            <Input
                              id="avatar_url"
                              value={form.avatar_url}
                              onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
                              placeholder="https://…"
                            />
                            <div className="text-xs text-muted-foreground">
                              Or upload an avatar from the header.
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={form.bio}
                            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                            rows={5}
                            placeholder="A short bio helps build trust."
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            Signed in as <span className="font-medium text-foreground">{user.email}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              disabled={!isDirty || saveMutation.isPending}
                              onClick={() => {
                                if (!initialRef.current) return;
                                setForm(initialRef.current);
                              }}
                            >
                              Reset
                            </Button>
                            <Button disabled={!isDirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Roles & Access</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">Your roles:</div>
                        <div className="flex flex-wrap gap-2">
                          {roles.map((r) => (
                            <Badge key={r}>{r}</Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          If you need elevated access, contact an administrator to grant your role.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                }
              />

              <Route
                path="preferences"
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <label className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
                        <div>
                          <div className="text-sm font-medium">Email notifications</div>
                          <div className="text-xs text-muted-foreground">Orders, repairs, and important updates</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
                        <div>
                          <div className="text-sm font-medium">Push notifications</div>
                          <div className="text-xs text-muted-foreground">Browser notifications (when enabled)</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyPush}
                          onChange={(e) => setNotifyPush(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => {
                          localStorage.setItem("profile-notify", JSON.stringify({ notifyEmail, notifyPush }));
                          toast.success("Preferences saved.");
                        }}
                      >
                        Save Preferences
                      </Button>
                    </CardContent>
                  </Card>
                }
              />

              <Route
                path="security"
                element={
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Security</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                            <Input
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="New email address"
                              inputMode="email"
                            />
                            <Button
                              variant="outline"
                              disabled={changeEmailMutation.isPending || !newEmail.trim()}
                              onClick={() => changeEmailMutation.mutate()}
                            >
                              {changeEmailMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Change Email
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            You may be asked to confirm this change via email.
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="text-sm font-medium">Change password</div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-password">New password</Label>
                              <div className="relative">
                                <Input
                                  id="new-password"
                                  type={showNewPwd ? "text" : "password"}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Min 8 characters"
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  onClick={() => setShowNewPwd((v) => !v)}
                                >
                                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirm password</Label>
                              <div className="relative">
                                <Input
                                  id="confirm-password"
                                  type={showConfirmPwd ? "text" : "password"}
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repeat new password"
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  onClick={() => setShowConfirmPwd((v) => !v)}
                                >
                                  {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={
                                changePasswordMutation.isPending || !newPassword.trim() || !confirmPassword.trim()
                              }
                              onClick={() => changePasswordMutation.mutate()}
                            >
                              {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Update Password
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                if (!user.email) return;
                                const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                                if (error) {
                                  toast.error(getErrorMessage(error, "Failed to send reset email."));
                                  return;
                                }
                                toast.success("Password reset email sent.");
                              }}
                            >
                              Send Reset Email
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => signOut()}>
                            Sign Out
                          </Button>
                          <Button variant="destructive" onClick={signOutEverywhere}>
                            Sign Out Everywhere
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                }
              />

              <Route
                path="activity"
                element={
                  <div className="space-y-6">
                    <ActivityTimelinePanel />
                  </div>
                }
              />

              <Route
                path="danger"
                element={
                  <Card className="border-destructive/30">
                    <CardHeader>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Requesting account deletion notifies our administrators. Your account and all associated data
                        will be permanently deleted within 48 hours.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={requestDeletionMutation.isPending}>
                            {requestDeletionMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Request Account Deletion
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This submits a deletion request. Your account, orders, listings, and all data will be
                              permanently deleted within 48 hours and cannot be recovered.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => requestDeletionMutation.mutate()}
                            >
                              Yes, Delete My Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                }
              />

              <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
          )}
        </div>
      </div>
    </div>
  );
}
