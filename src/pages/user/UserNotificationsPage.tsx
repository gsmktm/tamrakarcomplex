import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export default function UserNotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title="Notifications" noindex />
      <Header />
      <main className="flex-1 bg-secondary/20 py-8">
        <div className="container max-w-4xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
              <p className="mt-1 text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button variant="outline" onClick={() => markAllAsRead()}>
                <Check className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Bell className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-semibold">No notifications yet</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Important account, order, repair, and marketplace updates will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "overflow-hidden transition-colors",
                    !notification.read_at ? "border-primary/30 bg-primary/5" : "bg-background",
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          !notification.read_at ? "bg-primary" : "bg-muted-foreground/20",
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <h2 className="font-semibold leading-tight">{notification.title}</h2>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {notification.link ? (
                            <Button size="sm" asChild onClick={() => markAsRead(notification.id)}>
                              <Link to={notification.link}>
                                View details
                                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                          {!notification.read_at ? (
                            <Button size="sm" variant="outline" onClick={() => markAsRead(notification.id)}>
                              <Check className="mr-2 h-3.5 w-3.5" />
                              Mark read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
