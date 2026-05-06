import ProfileRoleWrapper from "@/components/profile/ProfileRoleWrapper";

/**
 * Shared personal account page for all admin roles (StoreAdmin, StaffAdmin, SuperAdmin).
 * Reuses the ProfileRoleWrapper logic but is accessed via role-specific routes.
 */
export default function AdminPersonalAccountPage() {
  return (
    <div className="container mx-auto py-8">
      <ProfileRoleWrapper />
    </div>
  );
}
