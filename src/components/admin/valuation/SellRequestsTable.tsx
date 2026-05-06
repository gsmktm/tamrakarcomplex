import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { LeadQuoteRow } from "@/types/app";

interface SellRequest {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  device: {
    brand: string;
    model: string;
    variant?: string;
    storage?: string;
    ram?: string;
  };
  condition: string;
  defects: string[];
  quoted_value: number;
  status: "new" | "scheduled" | "completed" | "cancelled";
  user?: {
    email: string;
  };
}

function isJsonRecord(value: Json | undefined | null): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Json | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapLeadQuoteRow(row: LeadQuoteRow): SellRequest {
  const device = isJsonRecord(row.device) ? row.device : {};
  return {
    id: row.id,
    created_at: row.created_at || new Date().toISOString(),
    user_id: row.user_id,
    type: row.type,
    device: {
      brand: readString(device.brand) || "-",
      model: readString(device.model) || "-",
      variant: readString(device.variant),
      storage: readString(device.storage),
      ram: readString(device.ram),
    },
    condition: row.condition || "good",
    defects: readStringArray(row.defects || undefined),
    quoted_value: row.quoted_value || 0,
    status: (row.status as SellRequest["status"]) || "new",
  };
}

export const SellRequestsTable = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-sell-requests"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("leads_quotes")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data ?? []).map(mapLeadQuoteRow);
      } catch (e: unknown) {
        // Fallback: read contact_messages where subject indicates fallback lead
        const { data: msgs, error: cmError } = await supabase
          .from("contact_messages")
          .select("*")
          .order("created_at", { ascending: false });
        if (cmError) throw cmError;
        const leads = (msgs ?? [])
          .filter((m) => (m.subject || "").toLowerCase().includes("sell lead"))
          .map((m) => {
            let payload: unknown = {};
            try {
              payload = JSON.parse(m.message || "{}");
            } catch {
              // Ignore malformed fallback payloads and keep the lead visible.
            }
            const p = payload as Record<string, unknown>;
            const dev = (p.device as Record<string, unknown>) || {};
            return {
              id: m.id,
              created_at: m.created_at,
              user_id: "", // unknown in fallback
              type: "cash",
              device: {
                brand: (dev.brand as string) || "-",
                model: (dev.model as string) || "-",
                storage: (dev.storage as string) || undefined,
                ram: (dev.ram as string) || undefined,
              },
              condition: typeof p.condition === "string" ? p.condition : "good",
              defects: Array.isArray(p.defects) ? p.defects.filter((item): item is string => typeof item === "string") : [],
              quoted_value: Number(p?.quoted_value as number) || 0,
              status: "new",
            } as SellRequest;
          });
        return leads as unknown as SellRequest[];
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SellRequest["status"] }) => {
      // If leads_quotes exists, update; if fallback, no-op
      try {
        const { error } = await supabase
          .from("leads_quotes")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      } catch {
        // Fallback mode - cannot update status in contact_messages
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sell-requests"] });
      toast({ title: "Status updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Unable to update status", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sell Requests</h2>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(req.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{req.device.brand} {req.device.model}</div>
                  <div className="text-xs text-muted-foreground">
                    {[req.device.storage, req.device.ram].filter(Boolean).join("/")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{req.condition.replace("_", " ")}</Badge>
                  {req.defects && req.defects.length > 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      {req.defects.length} defects
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  Rs. {req.quoted_value?.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={`
                    ${req.status === 'new' ? 'bg-blue-500' : ''}
                    ${req.status === 'scheduled' ? 'bg-yellow-500' : ''}
                    ${req.status === 'completed' ? 'bg-green-500' : ''}
                    ${req.status === 'cancelled' ? 'bg-gray-500' : ''}
                  `}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={req.status}
                    onValueChange={(value) => updateStatusMutation.mutate({ id: req.id, status: value as SellRequest["status"] })}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {requests?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No sell requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
