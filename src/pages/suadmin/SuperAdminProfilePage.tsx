import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { SEO } from "@/components/common/SEO";

const ProfileRoleWrapper = lazy(() => import("@/components/profile/ProfileRoleWrapper"));

export default function SuperAdminProfilePage() {
  return (
    <div className="animate-in fade-in duration-500">
      <SEO 
        title="My Account" 
        description="Manage your superadmin account settings."
        noindex
      />
      <Suspense
        fallback={
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ErrorBoundary>
          <ProfileRoleWrapper />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
