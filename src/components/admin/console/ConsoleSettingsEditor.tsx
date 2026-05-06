import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/utils";

type Scope = "global" | "store" | "user";

type Props = {
  title: string;
  description?: string;
  settingKey: string;
  scope: Scope;
  storeId?: string | null;
  userId?: string | null;
  defaultValue?: unknown;
};

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}

const sb = supabase;

export function ConsoleSettingsEditor({
  title,
  description,
  settingKey,
  scope,
  storeId,
  userId,
  defaultValue,
}: Props) {
  const queryKey = useMemo(
    () => ["console-settings", { scope, settingKey, storeId: storeId ?? null, userId: userId ?? null }],
    [scope, settingKey, storeId, userId],
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = sb.from("console_settings").select("id, value").eq("scope", scope).eq("key", settingKey);
      if (scope === "store") q = q.eq("store_id", storeId);
      if (scope === "user") q = q.eq("user_id", userId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as { id: string; value: unknown } | null;
    },
    enabled: scope === "global" || (scope === "store" ? !!storeId : !!userId),
    staleTime: 10_000,
  });

  const [text, setText] = useState<string>(() => stringifyJson(defaultValue));

  useEffect(() => {
    if (data?.value != null) {
      setText(stringifyJson(data.value));
      return;
    }
    setText(stringifyJson(defaultValue));
  }, [data?.value, defaultValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = parseJson(text);

      const payload: Record<string, unknown> = {
        scope,
        key: settingKey,
        value,
      };
      let onConflict = "key";

      if (scope === "store") {
        payload.store_id = storeId;
        onConflict = "key,store_id";
      }
      if (scope === "user") {
        payload.user_id = userId;
        onConflict = "key,user_id";
      }

      const { error } = await sb.from("console_settings").upsert(payload, { onConflict });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Saved."),
    onError: (e) => toast.error(getErrorMessage(e, "Failed to save setting.")),
  });

  const helpLine = scope === "store" && !storeId
    ? "Select a store context to edit this module."
    : scope === "user" && !userId
      ? "Missing user context."
      : description || "Stored in `console_settings` (private, role-protected).";

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              isLoading ||
              saveMutation.isPending ||
              (scope === "store" && !storeId) ||
              (scope === "user" && !userId)
            }
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{helpLine}</div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {getErrorMessage(error)}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>JSON value</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[260px] font-mono text-xs"
            placeholder={'{\n  "enabled": true\n}\n'}
            disabled={isLoading || (scope === "store" && !storeId) || (scope === "user" && !userId)}
          />
          <div className="text-xs text-muted-foreground">
            Key: <span className="font-mono">{settingKey}</span> · Scope: <span className="font-mono">{scope}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
