import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UnlockDevice } from "@/hooks/useRepair";

/**
 * All-models device browser for /unlocking.
 *
 * Sources:
 *  - phone_models: canonical device catalog (automatically picks up new DB models)
 *  - unlock_catalog: optional, separately maintained service capabilities
 *
 * Listing a device is NOT an assertion that a carrier, FRP, MDM, or repair
 * service supports it. Service eligibility must be confirmed per order.
 *
 * Supabase defaults to a 1,000-row API limit. Page through both catalogs
 * to avoid silently hiding newer devices after the first page.
 */
export type UnlockingModel = UnlockDevice & {
  catalog_source: "phone_models" | "unlock_catalog";
  model_number?: string | null;
};

const PAGE_SIZE = 500;
const MAX_PAGES = 200;

function missingTable(error: { code?: string; message?: string }): boolean {
  const message = (error.message || "").toLowerCase();
  return ["42P01", "PGRST200", "PGRST205"].includes(error.code || "") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist");
}

function normalized(text: string): string {
  return text.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "");
}

function modelKey(brand: string, model: string): string {
  return `${normalized(brand)}:${normalized(model)}`;
}

async function loadPhoneModels(): Promise<UnlockingModel[]> {
  const result: UnlockingModel[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("phone_models")
      .select("id,name,model_number,release_year,brands!inner(name)")
      .order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) {
      if (missingTable(error)) return [];
      throw error;
    }
    for (const row of data || []) {
      const relation = row.brands as unknown as { name?: string } | { name?: string }[] | null;
      const brand = Array.isArray(relation) ? relation[0]?.name : relation?.name;
      if (!brand || !row.name) continue;
      result.push({
        id: String(row.id),
        brand,
        model: row.name,
        model_number: row.model_number,
        variant: null,
        release_year: row.release_year || 0,
        supported_features: [],
        is_premium: false,
        created_at: "",
        catalog_source: "phone_models",
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return result;
}

async function loadUnlockCatalog(): Promise<UnlockingModel[]> {
  const result: UnlockingModel[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("unlock_catalog")
      .select("*")
      .order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) {
      if (missingTable(error)) return [];
      throw error;
    }
    for (const item of (data || []) as UnlockDevice[]) {
      if (!item.brand || !item.model) continue;
      result.push({
        ...item,
        supported_features: Array.isArray(item.supported_features) ? item.supported_features : [],
        catalog_source: "unlock_catalog",
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return result;
}

export function mergeUnlockingModels(
  deviceModels: UnlockingModel[],
  capabilityModels: UnlockingModel[],
): UnlockingModel[] {
  const merged = new Map<string, UnlockingModel>();
  for (const model of deviceModels) merged.set(modelKey(model.brand, model.model), model);
  for (const capability of capabilityModels) {
    const key = modelKey(capability.brand, capability.model);
    const existing = merged.get(key);
    merged.set(key, existing ? {
      ...existing,
      supported_features: capability.supported_features,
      is_premium: capability.is_premium,
      variant: capability.variant || existing.variant,
      release_year: existing.release_year || capability.release_year,
    } : capability);
  }
  return [...merged.values()].sort((a, b) =>
    a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, undefined, { numeric: true }),
  );
}

export function useUnlockingDeviceModels() {
  return useQuery({
    queryKey: ["unlocking", "all-automatic-models", "v2"],
    queryFn: async () => {
      const [devices, capabilities] = await Promise.all([loadPhoneModels(), loadUnlockCatalog()]);
      return mergeUnlockingModels(devices, capabilities);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
