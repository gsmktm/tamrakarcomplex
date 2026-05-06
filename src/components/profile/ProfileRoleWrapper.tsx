import { Suspense, lazy } from "react";
import { useProfile, ProfileProvider } from "./ProfileContext";
import { Loader2 } from "lucide-react";

const SuperAdminProfile = lazy(() => import("./SuperAdminProfile"));
const StaffAdminProfile = lazy(() => import("./StaffAdminProfile"));
const StoreAdminProfile = lazy(() => import("./StoreAdminProfile"));
const UserProfile = lazy(() => import("./UserProfile"));

function ProfileViewSelector() {
  const { role, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      {role === "suadmin" && <SuperAdminProfile />}
      {role === "staffadmin" && <StaffAdminProfile />}
      {role === "storeadmin" && <StoreAdminProfile />}
      {role === "user" && <UserProfile />}
      {!role && <UserProfile />}
    </Suspense>
  );
}

export default function ProfileRoleWrapper() {
  return (
    <ProfileProvider>
      <ProfileViewSelector />
    </ProfileProvider>
  );
}
