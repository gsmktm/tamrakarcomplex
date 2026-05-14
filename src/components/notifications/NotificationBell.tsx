import { Bell, Check, Clock, ExternalLink } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden rounded-xl shadow-xl border-border/60">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h3 className="font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary"
              onClick={() => markAllAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3 p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-bold text-sm">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">We'll notify you when something important happens.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "relative group flex gap-4 p-4 transition-colors hover:bg-muted/50",
                    !notification.read_at && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full mt-1.5 shrink-0",
                    !notification.read_at ? "bg-primary" : "bg-transparent"
                  )} />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-none truncate">{notification.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-2 pt-1">
                      {notification.link && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-[10px] font-bold px-2 rounded-lg"
                          asChild
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Link to={notification.link}>
                            View Details
                          </Link>
                        </Button>
                      )}
                      {!notification.read_at && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/10">
            <Button variant="ghost" size="sm" className="w-full text-xs font-medium h-9" asChild>
              <Link to="/user/notifications">
                See all notifications
              </Link>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
