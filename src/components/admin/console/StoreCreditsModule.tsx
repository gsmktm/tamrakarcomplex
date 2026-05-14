import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getErrorMessage } from "@/lib/utils";
import type { AppRole } from "@/types/app";

type AdminUserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
};

type StoreLite = { id: string; name: string };



function formatAmount(value: number) {
  if (Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

export function StoreCreditsModule() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("global");
  const [mode, setMode] = useState<"credit" | "debit">("credit");

  const isAdmin = role === "suadmin" || role === "staffadmin";

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<AdminUserRecord[]>({
    queryKey: ["console-store-credits-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_users_list_secure");
      if (!error) {
        return (data || []).map((u: { id: string; full_name?: string; email?: string; role?: string }) => ({
          id: u.id,
          full_name: u.full_name ?? null,
          email: u.email ?? null,
          role: (u.role ?? "public_user") as AppRole,
        }));
      }

      const { data: fallback, error: fallbackError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .order("created_at", { ascending: false });
      if (fallbackError) throw fallbackError;
      return (fallback || []).map((p: { user_id: string; display_name?: string }) => ({
        id: p.user_id,
        full_name: p.display_name ?? "Unknown",
        email: null,
        role: "public_user",
      }));
    },
    staleTime: 30_000,
  });

  const { data: stores } = useQuery<StoreLite[]>({
    queryKey: ["console-stores-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreLite[];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const { data: balances, error: balancesError } = useQuery<Array<{ user_id: string; store_id: string | null; balance: number }>>({
    queryKey: ["console-store-credit-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_credit_balances").select("user_id, store_id, balance");
      if (error) throw error;
      return (data || []) as Array<{ user_id: string; store_id: string | null; balance: number }>;
    },
    enabled: isAdmin,
    staleTime: 10_000,
  });

  const { data: recent, error: recentError } = useQuery<
    Array<{ id: string; user_id: string; store_id: string | null; amount: number; reason: string | null; created_at: string; created_by: string | null }>
  >({
    queryKey: ["console-store-credit-recent"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("store_credit_transactions")
        .select("id, user_id, store_id, amount, reason, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []);
    },
    enabled: isAdmin,
    staleTime: 5_000,
  });

  const userById = useMemo(() => {
    const map = new Map<string, AdminUserRecord>();
    (users || []).forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (stores || []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [stores]);

  const totalBalanceByUser = useMemo(() => {
    const map = new Map<string, number>();
    (balances || []).forEach((row) => {
      const current = map.get(row.user_id) ?? 0;
      map.set(row.user_id, current + Number(row.balance || 0));
    });
    return map;
  }, [balances]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users || [];
    return (users || []).filter((u) => {
      const name = (u.full_name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return u.id.toLowerCase().includes(q) || name.includes(q) || email.includes(q);
    });
  }, [search, users]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not logged in");
      if (!targetUserId) throw new Error("Select a user");
      const raw = Number(amount);
      if (!Number.isFinite(raw) || raw <= 0) throw new Error("Enter a positive amount");

      const signedAmount = mode === "debit" ? -Math.abs(raw) : Math.abs(raw);
      const payload = {
        user_id: targetUserId,
        store_id: storeId === "global" ? null : storeId,
        amount: signedAmount,
        reason: reason.trim() || null,
        created_by: user.id,
      };

      const { error } = await supabase.from("store_credit_transactions").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Store credit updated.");
      setDialogOpen(false);
      setAmount("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["console-store-credit-balances"] });
      await queryClient.invalidateQueries({ queryKey: ["console-store-credit-recent"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const missingDb = balancesError && isMissingTable(balancesError);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span>Store Credits</span>
            {isAdmin ? (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Adjust Credits
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Adjust store credits</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={mode === "credit" ? "default" : "outline"}
                        onClick={() => setMode("credit")}
                        type="button"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Credit
                      </Button>
                      <Button
                        variant={mode === "debit" ? "destructive" : "outline"}
                        onClick={() => setMode("debit")}
                        type="button"
                      >
                        <Minus className="mr-2 h-4 w-4" />
                        Debit
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select value={targetUserId} onValueChange={setTargetUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]">
                          {(users || []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {(u.full_name || u.email || u.id).slice(0, 60)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground font-mono">{targetUserId || "—"}</div>
                    </div>

                    <div className="space-y-2">
                      <Label>Store context</Label>
                      <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global (no store)</SelectItem>
                          {(stores || []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 500" />
                      <div className={cn("text-xs", mode === "debit" ? "text-destructive" : "text-muted-foreground")}>
                        Stored as: {mode === "debit" ? "-" : "+"}
                        {amount || "0"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Manual adjustment, refund, promotion, etc." />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)} type="button">
                        Cancel
                      </Button>
                      <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending} type="button">
                        {upsertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingDb ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="font-semibold">Store credits backend not installed</div>
              <div className="mt-1 text-muted-foreground">
                Apply the latest Supabase migrations (adds `store_credit_transactions`) then refresh.
              </div>
            </div>
          ) : null}

          {usersError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {getErrorMessage(usersError)}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="max-w-sm"
            />
            <div className="text-xs text-muted-foreground">
              {usersLoading ? "Loading users…" : `${filteredUsers.length} users`}
            </div>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredUsers || []).slice(0, 200).map((u) => {
                  const balance = totalBalanceByUser.get(u.id) ?? 0;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.full_name || u.email || u.id}</div>
                        <div className="text-xs text-muted-foreground">{u.email || u.id}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(balance)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTargetUserId(u.id);
                            setMode("credit");
                            setDialogOpen(true);
                          }}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {getErrorMessage(recentError)}
              </div>
            ) : null}

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recent || []).map((t) => {
                    const u = userById.get(t.user_id);
                    const storeName = t.store_id ? (storeNameById.get(t.store_id) ?? t.store_id) : "Global";
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="max-w-[260px]">
                          <div className="truncate font-medium">{u?.full_name || u?.email || t.user_id}</div>
                          <div className="truncate text-xs text-muted-foreground">{u?.email || t.user_id}</div>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">{storeName}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono",
                            t.amount < 0 ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {t.amount < 0 ? "-" : "+"}
                          {formatAmount(Math.abs(Number(t.amount)))}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                          {t.reason || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(recent || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
