import { useEffect, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export default function MyProfile() {
  const { data, loading, error, saveProfileChanges, refetch } = useProfile();
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    display_name: "",
    phone: "",
    bio: "",
    address: "",
    city: "",
    country: "Nepal",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      display_name: data.display_name ?? "",
      phone: data.phone ?? "",
      bio: data.bio ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      country: data.country ?? "Nepal",
    });
  }, [data]);

  const onSave = async () => {
    try {
      setSaving(true);
      await saveProfileChanges({
        ...form,
        avatarFile,
      });
      setAvatarFile(null);
      await refetch();
      toast.success("Profile saved successfully.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save profile.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Update your account information and identity details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={form.full_name} onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input id="display_name" value={form.display_name} onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
            {avatarFile ? <p className="text-xs text-muted-foreground">Selected: {avatarFile.name}</p> : null}
          </div>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {avatarFile ? <Upload className="mr-2 h-4 w-4" /> : null}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
