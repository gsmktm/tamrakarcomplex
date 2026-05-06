import { ProfileCenter } from "@/components/profile/ProfileCenter";

export default function UserProfilePage() {
  return (
    <div className="container mx-auto py-8">
      <ProfileCenter defaultTab="overview" />
    </div>
  );
}
