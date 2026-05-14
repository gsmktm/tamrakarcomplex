import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Notification {
  id: string;
  user_id: string | null;
  role: string | null;
  store_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: any;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id, role],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // RLS handles the filtering, but we can be explicit if needed
      // Based on the migration, it checks user_id, role, and store_id via store_admins/staff
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read_at).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // Check if it belongs to current user/role/store
          // Note: RLS will eventually filter this, but for real-time we might get everything
          // unless we use private channels. For now, we rely on basic checks or just refetch.
          
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          
          // Show toast for new notification
          toast.info(newNotif.title, {
            description: newNotif.message,
            action: newNotif.link ? {
              label: "View",
              onClick: () => window.location.href = newNotif.link!
            } : undefined
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null)
        .or(`user_id.eq.${user.id},role.eq.${role}`); // Simplified check
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
