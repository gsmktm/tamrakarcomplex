import { Link, useLocation } from "react-router-dom";
import { LogOut, User, Shield, Store, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";

interface UserMenuDropdownProps {
  user: SupabaseUser | null;
  onSignOut: () => void;
}

export function UserMenuDropdown({ user, onSignOut }: UserMenuDropdownProps) {
  const { role } = useAuth();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  const isSuperAdmin = role === "suadmin";
  const isStaffAdmin = role === "staffadmin";
  const isStoreAdmin = role === "storeadmin";

  if (!user) {
    return (
      <Link to="/auth" state={{ from: currentPath }}>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Login</span>
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled>
          <span className="text-sm text-muted-foreground truncate">{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/suadmin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4 text-primary" />
              <span>Super Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        {(isStaffAdmin || isSuperAdmin) && (
          <DropdownMenuItem asChild>
            <Link to="/staffadmin" className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
              <span>Staff Admin</span>
            </Link>
          </DropdownMenuItem>
        )}

        {(isStoreAdmin || isStaffAdmin || isSuperAdmin) && (
          <DropdownMenuItem asChild>
            <Link to="/storeadmin" className="flex items-center">
              <Store className="mr-2 h-4 w-4 text-primary" />
              <span>Store Dashboard</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to={
            isSuperAdmin ? "/suadmin/me" : 
            isStaffAdmin ? "/staffadmin/me" : 
            isStoreAdmin ? "/storeadmin/me" : 
            "/user/me"
          }>
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={
            isStoreAdmin ? "/storeadmin/my-subscription" :
            isSuperAdmin ? "/suadmin/subscriptions" :
            "/user/me?tab=subscription"
          }>
            My Subscription
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
