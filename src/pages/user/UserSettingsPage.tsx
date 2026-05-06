import { ProfileCenter } from "@/components/profile/ProfileCenter";

export default function UserSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <ProfileCenter defaultTab="security" />
    </div>
  );
}
