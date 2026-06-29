import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MasterModel {
  id: string;
  name: string;
  slug: string;
  release_year?: number;
  brand_name: string;
  brand_slug: string;
  canonical_slug: string;
  already_imported: boolean;
}

export function ModelImportPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"all" | "new" | "imported">("new");

  const { data: masterModels, isLoading } = useQuery({
    queryKey: ["import-master-models"],
    queryFn: async () => {
      // Fetch phone_models with brand join
      const [modelsResult, catalogResult] = await Promise.all([
        supabase
          .from("phone_models")
          .select("id, name, slug, release_year, brand_id, brands(name, slug)")
          .eq("status", "active")
          .order("name"),
        (supabase as any)
          .from("device_catalog")
          .select("canonical_slug"),
      ]);

      if (modelsResult.error) throw modelsResult.error;

      const existingSlugs = new Set((catalogResult.data ?? []).map((r) => r.canonical_slug));

      return (modelsResult.data ?? []).map((m): MasterModel => {
        const brand = m.brands as { name: string; slug: string } | null;
        const canonical = `${brand?.slug ?? "unknown"}-${m.slug}`;
        return {
          id: m.id,
          name: m.name,
          slug: m.slug,
          release_year: m.release_year ?? undefined,
          brand_name: brand?.name ?? "Unknown",
          brand_slug: brand?.slug ?? "unknown",
          canonical_slug: canonical,
          already_imported: existingSlugs.has(canonical),
        };
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (models: MasterModel[]) => {
      const rows = models.map((m) => ({
        brand: m.brand_name,
        model: m.name,
        canonical_slug: m.canonical_slug,
        release_year: m.release_year ?? null,
        variant: null,
        storage: null,
        ram: null,
      }));

      const { error } = await (supabase as any)
        .from("device_catalog")
        .upsert(rows, { onConflict: "canonical_slug" });

      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["import-master-models"] });
      qc.invalidateQueries({ queryKey: ["admin-device-catalog"] });
      setSelected(new Set());
      toast.success(`Imported ${count} model(s) into sell catalog`);
    },
    onError: (e: Error) => toast.error("Import failed: " + e.message),
  });

  const filtered = (masterModels ?? []).filter((m) => {
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.brand_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterMode === "all" ||
      (filterMode === "new" && !m.already_imported) ||
      (filterMode === "imported" && m.already_imported);
    return matchSearch && matchFilter;
  });

  const newModels = (masterModels ?? []).filter((m) => !m.already_imported);
  const importedCount = (masterModels ?? []).filter((m) => m.already_imported).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filtered.filter((m) => !m.already_imported).map((m) => m.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleImportSelected = () => {
    const toImport = (masterModels ?? []).filter((m) => selected.has(m.id));
    if (!toImport.length) return;
    importMutation.mutate(toImport);
  };

  const handleImportAll = () => {
    if (!newModels.length) {
      toast.info("All models already imported");
      return;
    }
    importMutation.mutate(newModels);
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{masterModels?.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total in Master Catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{newModels.length}</div>
            <p className="text-sm text-muted-foreground">Not Yet Imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{importedCount}</div>
            <p className="text-sm text-muted-foreground">Already in Sell Catalog</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Models to Sell Catalog</CardTitle>
          <CardDescription>
            Models added here appear as selectable devices in the sell-your-phone wizard.
            Existing entries update by slug (safe to re-import).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search brand or model…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {(["all", "new", "imported"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filterMode === f ? "default" : "outline"}
                  onClick={() => setFilterMode(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportSelected}
              disabled={selected.size === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Import Selected ({selected.size})
            </Button>
            <Button
              size="sm"
              onClick={handleImportAll}
              disabled={newModels.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Import All New ({newModels.length})
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {filterMode === "new" ? "All models already imported." : "No models found."}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          filtered.filter((m) => !m.already_imported).length > 0 &&
                          filtered
                            .filter((m) => !m.already_imported)
                            .every((m) => selected.has(m.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id} className={m.already_imported ? "opacity-60" : ""}>
                      <TableCell>
                        <Checkbox
                          disabled={m.already_imported}
                          checked={selected.has(m.id)}
                          onCheckedChange={(checked) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(m.id);
                              else next.delete(m.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{m.brand_name}</TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.release_year ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.canonical_slug}</TableCell>
                      <TableCell>
                        {m.already_imported ? (
                          <Badge variant="secondary" className="text-emerald-700 bg-emerald-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Imported
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            <AlertCircle className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
