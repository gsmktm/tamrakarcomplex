# Mobile Price Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GSMArena-style Nepal mobile price hub with 3 public pages, DB price/score/gallery tables, and new connection sections inside the existing MobileMasterManager admin.

**Architecture:** Extend the existing `phone_models / phone_variants / phone_specs` tables with price, expert score, image gallery, EMI, and retailer tables. Service methods added to `mobileMasterService.ts`. Public pages replace existing `/mobile-price/` pages at new `/cat/mobiles/` routes. Admin work adds sections inside the existing "Connections" tab in `MobileMasterManager.tsx` — no new admin pages except `EmiPlanManager`.

**Tech Stack:** React 18 + TypeScript + Vite + Supabase + TailwindCSS + shadcn/ui. No new libraries.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260609100000_mobile_price_hub.sql` | All new tables + trigger + RLS |
| Modify | `src/services/mobileMasterService.ts` | New interfaces + service methods |
| Modify | `src/pages/admin/MobileMasterManager.tsx` | New connection sections: Prices, Expert Score, Gallery, EMI |
| Create | `src/pages/admin/EmiPlanManager.tsx` | CRUD for `emi_plans` table |
| Modify | `src/routes/superAdminRoutes.tsx` | Route for EmiPlanManager |
| Create | `src/components/mobile/ModelCard.tsx` | Shared card for category/brand pages |
| Create | `src/pages/MobileCategoryPage.tsx` | `/cat/mobiles/` hub |
| Create | `src/pages/MobileBrandPage.tsx` | `/cat/mobiles/:brand/` |
| Create | `src/pages/ModelDetailPage.tsx` | `/mobile/:slug/` (replaces ModelHub) |
| Modify | `src/routes/publicRoutes.tsx` | New routes + redirects from old `/mobile-price/` |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260609100000_mobile_price_hub.sql`

- [ ] **Step 1: Write migration file**

```sql
-- =============================================
-- MOBILE PRICE HUB — 2026-06-09
-- =============================================

-- 1. ALTER phone_models — add SEO + metadata columns
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS market_status TEXT DEFAULT 'available';
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS is_top_rated BOOLEAN DEFAULT false;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS overview_content TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS launch_date_nepal DATE;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS user_rating_avg NUMERIC(3,2) DEFAULT 0;
ALTER TABLE phone_models ADD COLUMN IF NOT EXISTS user_rating_count INTEGER DEFAULT 0;

-- 2. ALTER phone_specs — add key_specs highlight + expert_rating
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS key_specs JSONB;
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS expert_rating NUMERIC(3,1);

-- 3. retailers
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  is_affiliate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. phone_variant_prices — master price table
CREATE TABLE IF NOT EXISTS phone_variant_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL,
  regular_price INTEGER NOT NULL,
  sale_price INTEGER,
  currency TEXT DEFAULT 'NPR',
  buy_url TEXT,
  stock_status TEXT DEFAULT 'in_stock',
  emi_available BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. price_history — immutable trigger log
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. expert_scores — one row per model
CREATE TABLE IF NOT EXISTS expert_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE UNIQUE,
  design_score NUMERIC(3,1),
  display_score NUMERIC(3,1),
  performance_score NUMERIC(3,1),
  software_score NUMERIC(3,1),
  camera_score NUMERIC(3,1),
  battery_score NUMERIC(3,1),
  value_score NUMERIC(3,1),
  review_post_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. model_images — per-model gallery
CREATE TABLE IF NOT EXISTS model_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. model_user_reviews
CREATE TABLE IF NOT EXISTS model_user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. emi_plans
CREATE TABLE IF NOT EXISTS emi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  processing_fee NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. model_emi
CREATE TABLE IF NOT EXISTS model_emi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  emi_plan_id UUID REFERENCES emi_plans(id) ON DELETE CASCADE,
  monthly_amount INTEGER NOT NULL,
  down_payment INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Trigger: log price changes to price_history
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.regular_price IS DISTINCT FROM NEW.regular_price THEN
    INSERT INTO price_history (model_id, variant_id, old_price, new_price)
    VALUES (NEW.model_id, NEW.variant_id, OLD.regular_price, NEW.regular_price);
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_history ON phone_variant_prices;
CREATE TRIGGER trg_price_history
  BEFORE UPDATE ON phone_variant_prices
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- 12. RLS — public read, authenticated write
ALTER TABLE phone_variant_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_prices" ON phone_variant_prices FOR SELECT USING (true);
CREATE POLICY "auth_write_prices" ON phone_variant_prices FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE expert_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_expert" ON expert_scores FOR SELECT USING (true);
CREATE POLICY "auth_write_expert" ON expert_scores FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE model_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_images" ON model_images FOR SELECT USING (true);
CREATE POLICY "auth_write_images" ON model_images FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE model_user_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_approved_reviews" ON model_user_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "auth_write_reviews" ON model_user_reviews FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE emi_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_emi_plans" ON emi_plans FOR SELECT USING (status = 'active');
CREATE POLICY "auth_write_emi_plans" ON emi_plans FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE model_emi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_model_emi" ON model_emi FOR SELECT USING (true);
CREATE POLICY "auth_write_model_emi" ON model_emi FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_retailers" ON retailers FOR SELECT USING (status = 'active');
CREATE POLICY "auth_write_retailers" ON retailers FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_history" ON price_history FOR SELECT USING (true);
```

- [ ] **Step 2: Apply via Supabase MCP or CLI**

```bash
# If using Supabase CLI:
cd /Users/sc/Downloads/tamrakar-main
npx supabase db push
# OR apply via MCP execute_sql in Supabase dashboard
```

Expected: No errors. Tables appear in Supabase dashboard.

- [ ] **Step 3: Verify tables exist**

```bash
# Quick REST check — list tables via Supabase
curl -s "https://tvgmnjuexdgtgtqhrjok.supabase.co/rest/v1/phone_variant_prices?limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z21uanVleGRndGd0cWhyam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTcxNDQsImV4cCI6MjA4ODEzMzE0NH0.VMJCM_-Qf5g-l88aQZDd5NP65S9JRlZrNjLpnt6uO7o" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z21uanVleGRndGd0cWhyam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTcxNDQsImV4cCI6MjA4ODEzMzE0NH0.VMJCM_-Qf5g-l88aQZDd5NP65S9JRlZrNjLpnt6uO7o"
```

Expected: `[]` (empty array, no error).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609100000_mobile_price_hub.sql
git commit -m "feat: add mobile price hub DB tables (prices, expert_scores, model_images, emi, retailers)"
```

---

## Task 2: Extend mobileMasterService.ts

**Files:**
- Modify: `src/services/mobileMasterService.ts` (currently 198 lines)

- [ ] **Step 1: Add new interfaces at top of file (after existing PhoneSpec interface, before `export const mobileMasterService`)**

Add after line 59 (`}`  closing PhoneSpec):

```typescript
export interface Retailer {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  is_affiliate: boolean;
  status: string;
}

export interface VariantPrice {
  id: string;
  model_id: string;
  variant_id: string;
  retailer_id?: string;
  regular_price: number;
  sale_price?: number;
  currency: string;
  buy_url?: string;
  stock_status: string;
  emi_available: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface ExpertScore {
  id: string;
  model_id: string;
  design_score?: number;
  display_score?: number;
  performance_score?: number;
  software_score?: number;
  camera_score?: number;
  battery_score?: number;
  value_score?: number;
  review_post_slug?: string;
}

export interface ModelImage {
  id: string;
  model_id: string;
  image_url: string;
  alt_text?: string;
  is_featured: boolean;
  sort_order: number;
}

export interface EmiPlan {
  id: string;
  bank_name: string;
  duration_months: number;
  interest_rate: number;
  processing_fee: number;
  status: string;
}

export interface ModelEmi {
  id: string;
  model_id: string;
  variant_id: string;
  emi_plan_id: string;
  monthly_amount: number;
  down_payment: number;
}

export interface ModelDetail {
  model: PhoneModel & {
    market_status: string;
    is_featured: boolean;
    is_upcoming: boolean;
    overview_content?: string;
    launch_date_nepal?: string;
    seo_title?: string;
    seo_description?: string;
    user_rating_avg: number;
    user_rating_count: number;
    brands?: { name: string; slug: string; logo?: string };
    phone_series?: { name: string; slug: string } | null;
  };
  variants: PhoneVariant[];
  prices: VariantPrice[];
  specs: PhoneSpec | null;
  images: ModelImage[];
  expertScore: ExpertScore | null;
}

export interface CategoryFilter {
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  market_status?: string;
  is_featured?: boolean;
  is_upcoming?: boolean;
  is_top_rated?: boolean;
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'rating';
  limit?: number;
  offset?: number;
}

export interface ModelListItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
  market_status: string;
  is_featured: boolean;
  is_upcoming: boolean;
  release_year?: number;
  brand_name: string;
  brand_slug: string;
  min_price?: number;
  expert_overall?: number;
}
```

- [ ] **Step 2: Add new methods to `mobileMasterService` object (append before closing `}`)**

```typescript
  // ── Prices ──────────────────────────────────────────────────
  async getVariantPrices(modelId: string): Promise<VariantPrice[]> {
    const { data, error } = await supabase
      .from('phone_variant_prices')
      .select('*')
      .eq('model_id', modelId)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as VariantPrice[];
  },

  async upsertVariantPrice(price: Partial<VariantPrice>): Promise<VariantPrice> {
    const { data, error } = await supabase
      .from('phone_variant_prices')
      .upsert(price)
      .select()
      .single();
    if (error) throw error;
    return data as VariantPrice;
  },

  async deleteVariantPrice(id: string): Promise<void> {
    const { error } = await supabase.from('phone_variant_prices').delete().eq('id', id);
    if (error) throw error;
  },

  async getPriceHistory(modelId: string, limit = 20) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // ── Expert Score ─────────────────────────────────────────────
  async getExpertScore(modelId: string): Promise<ExpertScore | null> {
    const { data, error } = await supabase
      .from('expert_scores')
      .select('*')
      .eq('model_id', modelId)
      .maybeSingle();
    if (error) throw error;
    return data as ExpertScore | null;
  },

  async upsertExpertScore(score: Partial<ExpertScore>): Promise<ExpertScore> {
    const { data, error } = await supabase
      .from('expert_scores')
      .upsert(score)
      .select()
      .single();
    if (error) throw error;
    return data as ExpertScore;
  },

  // ── Model Images ─────────────────────────────────────────────
  async getModelImages(modelId: string): Promise<ModelImage[]> {
    const { data, error } = await supabase
      .from('model_images')
      .select('*')
      .eq('model_id', modelId)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as ModelImage[];
  },

  async addModelImage(image: Partial<ModelImage>): Promise<ModelImage> {
    const { data, error } = await supabase
      .from('model_images')
      .insert(image)
      .select()
      .single();
    if (error) throw error;
    return data as ModelImage;
  },

  async deleteModelImage(id: string): Promise<void> {
    const { error } = await supabase.from('model_images').delete().eq('id', id);
    if (error) throw error;
  },

  async updateModelImage(id: string, updates: Partial<ModelImage>): Promise<void> {
    const { error } = await supabase.from('model_images').update(updates).eq('id', id);
    if (error) throw error;
  },

  // ── EMI Plans ────────────────────────────────────────────────
  async getEmiPlans(): Promise<EmiPlan[]> {
    const { data, error } = await supabase
      .from('emi_plans')
      .select('*')
      .eq('status', 'active')
      .order('bank_name');
    if (error) throw error;
    return (data ?? []) as EmiPlan[];
  },

  async getAllEmiPlans(): Promise<EmiPlan[]> {
    const { data, error } = await supabase
      .from('emi_plans')
      .select('*')
      .order('bank_name');
    if (error) throw error;
    return (data ?? []) as EmiPlan[];
  },

  async upsertEmiPlan(plan: Partial<EmiPlan>): Promise<EmiPlan> {
    const { data, error } = await supabase
      .from('emi_plans')
      .upsert(plan)
      .select()
      .single();
    if (error) throw error;
    return data as EmiPlan;
  },

  async deleteEmiPlan(id: string): Promise<void> {
    const { error } = await supabase.from('emi_plans').delete().eq('id', id);
    if (error) throw error;
  },

  async getModelEmi(modelId: string): Promise<ModelEmi[]> {
    const { data, error } = await supabase
      .from('model_emi')
      .select('*')
      .eq('model_id', modelId);
    if (error) throw error;
    return (data ?? []) as ModelEmi[];
  },

  async upsertModelEmi(emi: Partial<ModelEmi>): Promise<ModelEmi> {
    const { data, error } = await supabase
      .from('model_emi')
      .upsert(emi)
      .select()
      .single();
    if (error) throw error;
    return data as ModelEmi;
  },

  async deleteModelEmi(id: string): Promise<void> {
    const { error } = await supabase.from('model_emi').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Model Detail (full JOIN for public pages) ────────────────
  async getModelDetail(slug: string): Promise<ModelDetail | null> {
    const { data: model, error: mErr } = await supabase
      .from('phone_models')
      .select('*, brands(name, slug, logo), phone_series(name, slug)')
      .eq('slug', slug)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!model) return null;

    const [variants, prices, specs, images, expertScore] = await Promise.all([
      supabase.from('phone_variants').select('*').eq('model_id', model.id),
      supabase.from('phone_variant_prices').select('*').eq('model_id', model.id).order('sort_order'),
      supabase.from('phone_specs').select('*').eq('model_id', model.id).maybeSingle(),
      supabase.from('model_images').select('*').eq('model_id', model.id).order('sort_order'),
      supabase.from('expert_scores').select('*').eq('model_id', model.id).maybeSingle(),
    ]);

    return {
      model: model as ModelDetail['model'],
      variants: (variants.data ?? []) as PhoneVariant[],
      prices: (prices.data ?? []) as VariantPrice[],
      specs: (specs.data ?? null) as PhoneSpec | null,
      images: (images.data ?? []) as ModelImage[],
      expertScore: (expertScore.data ?? null) as ExpertScore | null,
    };
  },

  // ── Category / Brand listing ─────────────────────────────────
  async getModelList(filters: CategoryFilter = {}): Promise<{ items: ModelListItem[]; total: number }> {
    let query = supabase
      .from('phone_models')
      .select('id, name, slug, image, market_status, is_featured, is_upcoming, release_year, brand_id, brands(name, slug)', { count: 'exact' });

    if (filters.market_status) query = query.eq('market_status', filters.market_status);
    if (filters.is_featured) query = query.eq('is_featured', true);
    if (filters.is_upcoming) query = query.eq('is_upcoming', true);
    if (filters.brandSlugs?.length) {
      // Need brand_id filter — handled client-side after brands lookup or via join
      query = query.in('brands.slug', filters.brandSlugs);
    }
    query = query.eq('status', 'active');
    query = query.order('created_at', { ascending: false });
    if (filters.limit) query = query.range(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const items: ModelListItem[] = (data ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      image: m.image,
      market_status: m.market_status ?? 'available',
      is_featured: m.is_featured ?? false,
      is_upcoming: m.is_upcoming ?? false,
      release_year: m.release_year,
      brand_name: m.brands?.name ?? '',
      brand_slug: m.brands?.slug ?? '',
    }));

    return { items, total: count ?? 0 };
  },

  async getRetailers(): Promise<Retailer[]> {
    const { data, error } = await supabase
      .from('retailers')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return (data ?? []) as Retailer[];
  },
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/sc/Downloads/tamrakar-main
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add src/services/mobileMasterService.ts
git commit -m "feat: extend mobileMasterService with prices, expert score, gallery, EMI, model detail"
```

---

## Task 3: Admin — Prices + Expert Score + Gallery + EMI tabs in MobileMasterManager

**Files:**
- Modify: `src/pages/admin/MobileMasterManager.tsx`

The existing "Connections" tab at line ~349 has `ModelConnections` component rendering `SpecEditor` and `VariantEditor` sections. Add four new `ConnectionModule` sections after the existing two.

- [ ] **Step 1: Add imports for new service types at top of file**

Find: `import { mobileMasterService, Brand, PhoneSeries, PhoneModel, PhoneVariant } from "@/services/mobileMasterService";`

Replace with:

```typescript
import { mobileMasterService, Brand, PhoneSeries, PhoneModel, PhoneVariant, VariantPrice, ExpertScore, ModelImage, EmiPlan, ModelEmi } from "@/services/mobileMasterService";
```

- [ ] **Step 2: Add PriceEditor component before the final export default**

Append before `export default function MobileMasterManager()`:

```tsx
function PriceEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<VariantPrice>>({ currency: 'NPR', stock_status: 'in_stock', is_default: false, sort_order: 0 });

  const { data: variants } = useQuery({ queryKey: ['variants', modelId], queryFn: () => mobileMasterService.getVariants(modelId) });
  const { data: prices, isLoading } = useQuery({ queryKey: ['variant_prices', modelId], queryFn: () => mobileMasterService.getVariantPrices(modelId) });
  const { data: retailers } = useQuery({ queryKey: ['retailers'], queryFn: () => mobileMasterService.getRetailers() });

  const upsert = useMutation({
    mutationFn: (p: Partial<VariantPrice>) => mobileMasterService.upsertVariantPrice({ ...p, model_id: modelId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant_prices', modelId] }); setAdding(false); toast.success('Price saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteVariantPrice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variant_prices', modelId] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading prices...</div>;

  return (
    <div className="space-y-3">
      {(prices ?? []).map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
          <div className="flex-1">
            <div className="font-medium">NPR {p.regular_price.toLocaleString()}{p.sale_price ? ` → ${p.sale_price.toLocaleString()}` : ''}</div>
            <div className="text-muted-foreground">{p.stock_status} · {p.is_default ? 'Default' : ''}</div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => del.mutate(p.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {adding ? (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Variant</Label>
              <Select value={form.variant_id ?? ''} onValueChange={(v) => setForm(f => ({ ...f, variant_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick variant" /></SelectTrigger>
                <SelectContent>{(variants ?? []).map(v => <SelectItem key={v.id} value={v.id}>{v.ram}/{v.storage} {v.color}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Regular Price (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.regular_price ?? ''} onChange={e => setForm(f => ({ ...f, regular_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Sale Price (NPR, optional)</Label>
              <Input className="h-8 text-sm" type="number" value={form.sale_price ?? ''} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">Stock Status</Label>
              <Select value={form.stock_status ?? 'in_stock'} onValueChange={(v) => setForm(f => ({ ...f, stock_status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="pre_order">Pre-Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Buy URL</Label>
              <Input className="h-8 text-sm" value={form.buy_url ?? ''} onChange={e => setForm(f => ({ ...f, buy_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => upsert.mutate(form)} disabled={!form.variant_id || !form.regular_price || upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add Price</Button>
      )}
    </div>
  );
}

function ExpertScoreEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const { data: score, isLoading } = useQuery({ queryKey: ['expert_score', modelId], queryFn: () => mobileMasterService.getExpertScore(modelId) });
  const [form, setForm] = useState<Partial<ExpertScore>>({});

  useEffect(() => { if (score) setForm(score); }, [score]);

  const save = useMutation({
    mutationFn: (s: Partial<ExpertScore>) => mobileMasterService.upsertExpertScore({ ...s, model_id: modelId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expert_score', modelId] }); toast.success('Expert score saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const DIMENSIONS: { key: keyof ExpertScore; label: string }[] = [
    { key: 'design_score', label: 'Design' },
    { key: 'display_score', label: 'Display' },
    { key: 'performance_score', label: 'Performance' },
    { key: 'software_score', label: 'Software' },
    { key: 'camera_score', label: 'Camera' },
    { key: 'battery_score', label: 'Battery' },
    { key: 'value_score', label: 'Value' },
  ];

  const overall = (() => {
    const scores = DIMENSIONS.map(d => form[d.key] as number | undefined).filter((v): v is number => v != null);
    if (!scores.length) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {overall && <div className="text-2xl font-bold text-primary">{overall}<span className="text-sm font-normal text-muted-foreground">/10 overall</span></div>}
      <div className="grid grid-cols-2 gap-2">
        {DIMENSIONS.map(({ key, label }) => (
          <div key={key}>
            <Label className="text-xs">{label} (0–10)</Label>
            <Input className="h-8 text-sm" type="number" min={0} max={10} step={0.1}
              value={form[key] as number ?? ''} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) || undefined }))} />
          </div>
        ))}
        <div className="col-span-2">
          <Label className="text-xs">Review post slug (optional)</Label>
          <Input className="h-8 text-sm" value={form.review_post_slug ?? ''} onChange={e => setForm(f => ({ ...f, review_post_slug: e.target.value }))} placeholder="samsung-galaxy-s24-review" />
        </div>
      </div>
      <Button size="sm" onClick={() => save.mutate(form)} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Save Score
      </Button>
    </div>
  );
}

function GalleryEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const { data: images, isLoading } = useQuery({ queryKey: ['model_images', modelId], queryFn: () => mobileMasterService.getModelImages(modelId) });

  const add = useMutation({
    mutationFn: () => mobileMasterService.addModelImage({ model_id: modelId, image_url: url, alt_text: alt, sort_order: (images?.length ?? 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model_images', modelId] }); setUrl(''); setAlt(''); toast.success('Image added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModelImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_images', modelId] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => mobileMasterService.updateModelImage(id, { is_featured: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_images', modelId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {(images ?? []).map((img) => (
        <div key={img.id} className="flex items-center gap-2 text-sm border rounded p-2">
          <img src={img.image_url} alt={img.alt_text ?? ''} className="h-10 w-10 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/default-product.svg'; }} />
          <div className="flex-1 truncate">{img.image_url}</div>
          <Button size="sm" variant={img.is_featured ? 'default' : 'outline'} className="h-6 text-xs" onClick={() => toggleFeatured.mutate({ id: img.id, val: !img.is_featured })}>
            {img.is_featured ? '★' : '☆'}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => del.mutate(img.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input className="h-8 text-sm flex-1" placeholder="Image URL" value={url} onChange={e => setUrl(e.target.value)} />
        <Input className="h-8 text-sm w-32" placeholder="Alt text" value={alt} onChange={e => setAlt(e.target.value)} />
        <Button size="sm" onClick={() => add.mutate()} disabled={!url || add.isPending}>Add</Button>
      </div>
    </div>
  );
}

function EmiConnectionEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const { data: plans } = useQuery({ queryKey: ['emi_plans'], queryFn: () => mobileMasterService.getEmiPlans() });
  const { data: variants } = useQuery({ queryKey: ['variants', modelId], queryFn: () => mobileMasterService.getVariants(modelId) });
  const { data: emis, isLoading } = useQuery({ queryKey: ['model_emi', modelId], queryFn: () => mobileMasterService.getModelEmi(modelId) });
  const [form, setForm] = useState<Partial<ModelEmi>>({ down_payment: 0 });
  const [adding, setAdding] = useState(false);

  const add = useMutation({
    mutationFn: (e: Partial<ModelEmi>) => mobileMasterService.upsertModelEmi({ ...e, model_id: modelId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model_emi', modelId] }); setAdding(false); toast.success('EMI saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModelEmi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_emi', modelId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {(emis ?? []).map((e) => (
        <div key={e.id} className="flex items-center gap-3 p-2 border rounded text-sm">
          <div className="flex-1">NPR {e.monthly_amount.toLocaleString()}/mo · DP {e.down_payment.toLocaleString()}</div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => del.mutate(e.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      {adding ? (
        <div className="border rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Variant</Label>
              <Select value={form.variant_id ?? ''} onValueChange={v => setForm(f => ({ ...f, variant_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick variant" /></SelectTrigger>
                <SelectContent>{(variants ?? []).map(v => <SelectItem key={v.id} value={v.id}>{v.ram}/{v.storage}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">EMI Plan</Label>
              <Select value={form.emi_plan_id ?? ''} onValueChange={v => setForm(f => ({ ...f, emi_plan_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick plan" /></SelectTrigger>
                <SelectContent>{(plans ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.bank_name} {p.duration_months}mo</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Monthly Amount (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.monthly_amount ?? ''} onChange={e => setForm(f => ({ ...f, monthly_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Down Payment (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.down_payment ?? 0} onChange={e => setForm(f => ({ ...f, down_payment: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => add.mutate(form)} disabled={!form.variant_id || !form.emi_plan_id || !form.monthly_amount || add.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add EMI</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add `useEffect` import if missing**

Check line 1 — `import { useState, useEffect } from "react";` already exists. ✓ No change needed.

- [ ] **Step 4: Wire new sections into `ModelConnections` component**

Find in `MobileMasterManager.tsx` (around line 660):

```tsx
          title="Variants" 
```

After the VariantEditor ConnectionModule block (find its closing tag), add:

```tsx
          <ConnectionModule
            title="Prices"
            description="Variant prices, stock status, buy URLs, retailer links."
            action={<PriceEditor modelId={modelId} />}
          />
          <ConnectionModule
            title="Expert Score"
            description="7 dimension scores (0–10). Overall auto-computed."
            action={<ExpertScoreEditor modelId={modelId} />}
          />
          <ConnectionModule
            title="Gallery"
            description="Image gallery for the model detail page."
            action={<GalleryEditor modelId={modelId} />}
          />
          <ConnectionModule
            title="EMI"
            description="EMI offers linked to bank plans."
            action={<EmiConnectionEditor modelId={modelId} />}
          />
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 new errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/MobileMasterManager.tsx
git commit -m "feat: add Prices, Expert Score, Gallery, EMI sections to MobileMasterManager"
```

---

## Task 4: EmiPlanManager admin page

**Files:**
- Create: `src/pages/admin/EmiPlanManager.tsx`
- Modify: `src/routes/superAdminRoutes.tsx`

- [ ] **Step 1: Create EmiPlanManager.tsx**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
import { mobileMasterService, EmiPlan } from "@/services/mobileMasterService";
import { toast } from "sonner";

const EMPTY: Partial<EmiPlan> = { bank_name: '', duration_months: 12, interest_rate: 0, processing_fee: 0, status: 'active' };

export default function EmiPlanManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmiPlan | null>(null);
  const [form, setForm] = useState<Partial<EmiPlan>>(EMPTY);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['all_emi_plans'],
    queryFn: () => mobileMasterService.getAllEmiPlans(),
  });

  const save = useMutation({
    mutationFn: (p: Partial<EmiPlan>) => mobileMasterService.upsertEmiPlan(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all_emi_plans'] }); qc.invalidateQueries({ queryKey: ['emi_plans'] }); setOpen(false); toast.success('EMI plan saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteEmiPlan(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all_emi_plans'] }); toast.success('EMI plan deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: EmiPlan) { setEditing(p); setForm(p); setOpen(true); }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">EMI Plans</h1>
          <p className="text-sm text-muted-foreground">Manage bank/NBFC EMI plans used for mobile pricing.</p>
        </div>
        <Button className="ml-auto gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Plan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank / NBFC</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Processing Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plans ?? []).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.bank_name}</TableCell>
                    <TableCell>{p.duration_months} months</TableCell>
                    <TableCell>{p.interest_rate}%</TableCell>
                    <TableCell>{p.processing_fee}%</TableCell>
                    <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => del.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!plans?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No EMI plans yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit EMI Plan' : 'Add EMI Plan'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>Bank / NBFC Name</Label>
              <Input value={form.bank_name ?? ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. NIC Asia Bank" />
            </div>
            <div>
              <Label>Duration (months)</Label>
              <Input type="number" value={form.duration_months ?? 12} onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input type="number" step="0.01" value={form.interest_rate ?? 0} onChange={e => setForm(f => ({ ...f, interest_rate: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Processing Fee (%)</Label>
              <Input type="number" step="0.01" value={form.processing_fee ?? 0} onChange={e => setForm(f => ({ ...f, processing_fee: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.bank_name || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Add route to superAdminRoutes.tsx**

Find: `{ path: "/suadmin/price-list", element: w(PriceListManager) },`

Add after it:

```typescript
  { path: "/suadmin/emi-plans", element: w(EmiPlanManager) },
```

Also add the import at top of superAdminRoutes.tsx (near other admin imports):

```typescript
const EmiPlanManager = lazy(() => import("@/pages/admin/EmiPlanManager"));
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/EmiPlanManager.tsx src/routes/superAdminRoutes.tsx
git commit -m "feat: add EmiPlanManager admin page at /suadmin/emi-plans"
```

---

## Task 5: ModelCard shared component

**Files:**
- Create: `src/components/mobile/ModelCard.tsx`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p /Users/sc/Downloads/tamrakar-main/src/components/mobile
```

- [ ] **Step 2: Write ModelCard.tsx**

```tsx
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/common/SafeImage";
import type { ModelListItem } from "@/services/mobileMasterService";

interface ModelCardProps {
  model: ModelListItem;
  className?: string;
}

export function ModelCard({ model, className = '' }: ModelCardProps) {
  const displayPrice = model.min_price
    ? `NPR ${model.min_price.toLocaleString()}`
    : 'Price TBA';

  return (
    <Link
      to={`/mobile/${model.slug}`}
      className={`group block rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        <SafeImage
          src={model.image}
          alt={model.name}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          aspect="square"
        />
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {model.is_upcoming && <Badge variant="secondary" className="text-[10px] h-5">Upcoming</Badge>}
          {model.is_featured && <Badge className="text-[10px] h-5 bg-amber-500 hover:bg-amber-500">Featured</Badge>}
        </div>
        {model.expert_overall && (
          <div className="absolute bottom-2 right-2 bg-background/90 rounded-full px-1.5 py-0.5 text-xs font-bold text-primary border">
            {model.expert_overall}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{model.brand_name}</div>
        <div className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {model.name}
        </div>
        <div className="pt-1">
          <span className="text-sm font-bold text-foreground">{displayPrice}</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/ModelCard.tsx
git commit -m "feat: add ModelCard component for mobile listing pages"
```

---

## Task 6: MobileCategoryPage (/cat/mobiles/)

**Files:**
- Create: `src/pages/MobileCategoryPage.tsx`

- [ ] **Step 1: Write MobileCategoryPage.tsx**

```tsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelCard } from "@/components/mobile/ModelCard";
import { mobileMasterService, CategoryFilter } from "@/services/mobileMasterService";
import { Search, SlidersHorizontal } from "lucide-react";

const FILTER_CHIPS = [
  { label: 'All', filter: {} },
  { label: 'iPhones', filter: { brandSlugs: ['apple'] } },
  { label: 'Upcoming', filter: { is_upcoming: true } },
  { label: 'Featured', filter: { is_featured: true } },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'rating', label: 'Top Rated' },
];

export default function MobileCategoryPage() {
  const [activeChip, setActiveChip] = useState(0);
  const [sort, setSort] = useState<CategoryFilter['sort']>('latest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const filters: CategoryFilter = {
    ...FILTER_CHIPS[activeChip].filter,
    sort,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data: brands } = useQuery({
    queryKey: ['brands_list'],
    queryFn: () => mobileMasterService.getBrands(),
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['model_list', filters],
    queryFn: () => mobileMasterService.getModelList(filters),
    staleTime: 3 * 60 * 1000,
    placeholderData: prev => prev,
  });

  const filtered = (data?.items ?? []).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Mobile Price in Nepal 2026 | Tamrakar Complex</title>
        <meta name="description" content="Latest mobile phone prices in Nepal. Compare iPhone, Samsung, Xiaomi, OnePlus prices. Updated daily." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">Mobile Price in Nepal</h1>
            <p className="text-muted-foreground mb-6">Latest prices, specs & expert reviews for phones available in Nepal.</p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search iPhone, Samsung, Xiaomi..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Filter chips + sort */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((chip, i) => (
              <Button key={chip.label} size="sm" variant={activeChip === i ? 'default' : 'outline'}
                onClick={() => { setActiveChip(i); setPage(0); }}>
                {chip.label}
              </Button>
            ))}
            <div className="ml-auto flex gap-2">
              {SORT_OPTIONS.map(o => (
                <Button key={o.value} size="sm" variant={sort === o.value ? 'default' : 'ghost'}
                  onClick={() => setSort(o.value as CategoryFilter['sort'])}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Brand quick links */}
          {brands && brands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brands.filter(b => b.status === 'active').map(b => (
                <Link key={b.id} to={`/cat/mobiles/${b.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:border-primary hover:text-primary transition-colors">
                    {b.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No phones found. Try a different filter.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          )}

          {/* Pagination */}
          {(data?.total ?? 0) > PAGE_SIZE && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-muted-foreground px-4">
                Page {page + 1} of {Math.ceil((data?.total ?? 0) / PAGE_SIZE)}
              </span>
              <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}

          {/* SEO content */}
          <div className="prose prose-sm max-w-none pt-8 border-t">
            <h2>Mobile Phone Price in Nepal</h2>
            <p>Tamrakar Complex provides the most up-to-date mobile phone prices in Nepal, covering all major brands including Apple, Samsung, Xiaomi, OnePlus, Realme, and more. Our prices are verified with authorized dealers in Kathmandu.</p>
            <h3>How to choose a phone in Nepal?</h3>
            <p>Consider your budget, required storage, camera requirements, and battery life. For flagship performance, Apple iPhone 16 series and Samsung Galaxy S25 are top picks. For value, Xiaomi and Realme offer excellent specs at mid-range prices.</p>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/MobileCategoryPage.tsx
git commit -m "feat: add MobileCategoryPage at /cat/mobiles/"
```

---

## Task 7: MobileBrandPage (/cat/mobiles/:brand/)

**Files:**
- Create: `src/pages/MobileBrandPage.tsx`

- [ ] **Step 1: Write MobileBrandPage.tsx**

```tsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelCard } from "@/components/mobile/ModelCard";
import { SafeImage } from "@/components/common/SafeImage";
import { mobileMasterService } from "@/services/mobileMasterService";
import { Search, ChevronRight } from "lucide-react";

export default function MobileBrandPage() {
  const { brand: brandSlug } = useParams<{ brand: string }>();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');

  const { data: brands } = useQuery({
    queryKey: ['brands_list'],
    queryFn: () => mobileMasterService.getBrands(),
    staleTime: 10 * 60 * 1000,
  });

  const brand = brands?.find(b => b.slug === brandSlug);

  const { data, isLoading } = useQuery({
    queryKey: ['model_list_brand', brandSlug, sort],
    queryFn: () => mobileMasterService.getModelList({ brandSlugs: brandSlug ? [brandSlug] : [], sort, limit: 100 }),
    enabled: !!brandSlug,
    staleTime: 3 * 60 * 1000,
  });

  const filtered = (data?.items ?? []).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const brandName = brand?.name ?? (brandSlug ? brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1) : 'Brand');

  return (
    <>
      <Helmet>
        <title>{brandName} Phone Price in Nepal 2026 | Tamrakar Complex</title>
        <meta name="description" content={`All ${brandName} phone prices in Nepal. Compare ${brandName} models, specs, and buy online.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Brand hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cat/mobiles/" className="hover:text-foreground">Mobiles</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{brandName}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              {brand?.logo && (
                <div className="h-12 w-12 rounded-xl border bg-white p-1 flex-shrink-0">
                  <SafeImage src={brand.logo} alt={brandName} className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{brandName} Price in Nepal</h1>
                <p className="text-muted-foreground">{data?.total ?? 0} models available</p>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={`Search ${brandName} phones...`} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Sort */}
          <div className="flex gap-2">
            {(['latest', 'price_asc', 'price_desc'] as const).map(s => (
              <Button key={s} size="sm" variant={sort === s ? 'default' : 'outline'} onClick={() => setSort(s)}>
                {s === 'latest' ? 'Latest' : s === 'price_asc' ? 'Price ↑' : 'Price ↓'}
              </Button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No {brandName} phones found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          )}

          {/* SEO */}
          <div className="prose prose-sm max-w-none pt-8 border-t">
            <h2>{brandName} Mobile Price in Nepal</h2>
            <p>Browse all {brandName} mobile phones available in Nepal with official prices. Find the latest {brandName} models, compare specs, and check EMI options from authorized dealers.</p>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/MobileBrandPage.tsx
git commit -m "feat: add MobileBrandPage at /cat/mobiles/:brand/"
```

---

## Task 8: ModelDetailPage (/mobile/:slug/)

**Files:**
- Create: `src/pages/ModelDetailPage.tsx`

Note: The existing `ModelHub.tsx` stays — it will be replaced at route level. Do NOT delete it yet (it may still be in use elsewhere).

- [ ] **Step 1: Write ModelDetailPage.tsx**

```tsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SafeImage } from "@/components/common/SafeImage";
import { mobileMasterService, VariantPrice, ExpertScore, ModelImage } from "@/services/mobileMasterService";
import { ChevronRight, Star, ShoppingBag, TrendingDown, CreditCard, ExternalLink } from "lucide-react";

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const pct = (value / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24 text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

function computeOverall(s: ExpertScore): number | null {
  const vals = [s.design_score, s.display_score, s.performance_score, s.software_score, s.camera_score, s.battery_score, s.value_score].filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export default function ModelDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['model_detail', slug],
    queryFn: () => mobileMasterService.getModelDetail(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-12 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!detail || error) {
    return <div className="text-center py-24 text-muted-foreground">Phone not found.</div>;
  }

  const { model, variants, prices, specs, images, expertScore } = detail;
  const overall = expertScore ? computeOverall(expertScore) : null;

  const activeVariantId = selectedVariantId ?? variants[0]?.id ?? null;
  const variantPrices = prices.filter(p => p.variant_id === activeVariantId);
  const defaultPrice = variantPrices.find(p => p.is_default) ?? variantPrices[0];

  const galleryImages: string[] = images.length > 0
    ? images.map(i => i.image_url)
    : model.image ? [model.image] : [];

  const specEntries = specs?.full_specs_json
    ? Object.entries(specs.full_specs_json as Record<string, Record<string, string>>)
    : [];

  return (
    <>
      <Helmet>
        <title>{model.seo_title ?? `${model.name} Price in Nepal | Tamrakar Complex`}</title>
        <meta name="description" content={model.seo_description ?? `${model.name} price in Nepal, specs, and expert review. Buy from authorized dealers.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cat/mobiles/" className="hover:text-foreground">Mobiles</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/cat/mobiles/${model.brands?.slug}`} className="hover:text-foreground">{model.brands?.name}</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{model.name}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Main: gallery + price panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl border bg-muted/20 overflow-hidden">
                <SafeImage
                  src={galleryImages[galleryIdx]}
                  alt={model.name}
                  className="w-full h-full object-contain p-6"
                  loading="eager"
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((url, i) => (
                    <button key={i} onClick={() => setGalleryIdx(i)}
                      className={`flex-shrink-0 h-16 w-16 rounded-lg border-2 overflow-hidden transition-all ${i === galleryIdx ? 'border-primary' : 'border-transparent'}`}>
                      <SafeImage src={url} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="space-y-5">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{model.brands?.name}</div>
                <h1 className="text-2xl font-bold leading-tight">{model.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {model.is_upcoming && <Badge variant="secondary">Upcoming</Badge>}
                  {model.is_featured && <Badge className="bg-amber-500 hover:bg-amber-500">Featured</Badge>}
                  {model.market_status === 'discontinued' && <Badge variant="outline" className="text-muted-foreground">Discontinued</Badge>}
                </div>
              </div>

              {/* Expert score badge */}
              {overall && (
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">{overall}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Expert Score</div>
                    <div className="flex text-amber-400">{Array.from({ length: Math.round(overall / 2) }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div>
                  </div>
                </div>
              )}

              {/* Variant picker */}
              {variants.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Variants</div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(v => (
                      <button key={v.id} onClick={() => setSelectedVariantId(v.id)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${activeVariantId === v.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'}`}>
                        {[v.ram, v.storage, v.color].filter(Boolean).join(' / ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              {defaultPrice ? (
                <div className="rounded-xl border p-4 space-y-3 bg-card">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      NPR {(defaultPrice.sale_price ?? defaultPrice.regular_price).toLocaleString()}
                    </span>
                    {defaultPrice.sale_price && (
                      <span className="text-muted-foreground line-through text-lg mb-0.5">
                        {defaultPrice.regular_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Badge variant={defaultPrice.stock_status === 'in_stock' ? 'default' : defaultPrice.stock_status === 'pre_order' ? 'secondary' : 'outline'}>
                    {defaultPrice.stock_status === 'in_stock' ? 'In Stock' : defaultPrice.stock_status === 'pre_order' ? 'Pre-Order' : 'Out of Stock'}
                  </Badge>
                  {defaultPrice.buy_url && (
                    <Button className="w-full gap-2" asChild>
                      <a href={defaultPrice.buy_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingBag className="h-4 w-4" />Buy Now
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                  {defaultPrice.emi_available && (
                    <Button variant="outline" className="w-full gap-2" onClick={() => document.getElementById('emi-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      <CreditCard className="h-4 w-4" />View EMI Options
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border p-4 text-muted-foreground text-sm">Price coming soon.</div>
              )}

              {/* Key specs quick bar */}
              {specs && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {specs.display && <div className="bg-muted/50 rounded-lg p-2"><div className="text-xs text-muted-foreground">Display</div><div className="font-medium truncate">{typeof specs.display === 'string' ? specs.display.split(',')[0] : ''}</div></div>}
                  {specs.processor && <div className="bg-muted/50 rounded-lg p-2"><div className="text-xs text-muted-foreground">Processor</div><div className="font-medium truncate">{typeof specs.processor === 'string' ? specs.processor.split(',')[0] : ''}</div></div>}
                  {specs.camera && <div className="bg-muted/50 rounded-lg p-2"><div className="text-xs text-muted-foreground">Camera</div><div className="font-medium truncate">{typeof specs.camera === 'string' ? specs.camera.split(',')[0] : ''}</div></div>}
                  {specs.battery && <div className="bg-muted/50 rounded-lg p-2"><div className="text-xs text-muted-foreground">Battery</div><div className="font-medium truncate">{typeof specs.battery === 'string' ? specs.battery.split(',')[0] : ''}</div></div>}
                </div>
              )}
            </div>
          </div>

          {/* Detail tabs */}
          <Tabs defaultValue="specs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              {expertScore && <TabsTrigger value="score">Expert Score</TabsTrigger>}
              {model.overview_content && <TabsTrigger value="overview">Overview</TabsTrigger>}
              <TabsTrigger value="emi" id="emi-section">EMI</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="space-y-6">
              {specEntries.length > 0 ? specEntries.map(([category, fields]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">{category}</h3>
                  <div className="rounded-xl border overflow-hidden">
                    {Object.entries(fields).map(([k, v], i) => (
                      <div key={k} className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                        <span className="text-muted-foreground w-36 flex-shrink-0">{k}</span>
                        <span className="font-medium flex-1">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : specs ? (
                <div className="rounded-xl border overflow-hidden">
                  {[
                    ['Display', specs.display],
                    ['Processor', specs.processor],
                    ['Camera', specs.camera],
                    ['Battery', specs.battery],
                    ['Charging', specs.charging],
                    ['OS', specs.os],
                    ['Network', specs.network],
                    ['Body', specs.body],
                  ].filter(([, v]) => v).map(([k, v], i) => (
                    <div key={k} className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <span className="text-muted-foreground w-24 flex-shrink-0">{k}</span>
                      <span className="font-medium flex-1">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Specs not available yet.</p>
              )}
            </TabsContent>

            {expertScore && (
              <TabsContent value="score" className="space-y-4 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-2xl">{overall}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Expert Score</div>
                    <div className="text-sm text-muted-foreground">Based on {Object.values(expertScore).filter(v => typeof v === 'number').length} dimensions</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Design" value={expertScore.design_score ?? undefined} />
                  <ScoreBar label="Display" value={expertScore.display_score ?? undefined} />
                  <ScoreBar label="Performance" value={expertScore.performance_score ?? undefined} />
                  <ScoreBar label="Software" value={expertScore.software_score ?? undefined} />
                  <ScoreBar label="Camera" value={expertScore.camera_score ?? undefined} />
                  <ScoreBar label="Battery" value={expertScore.battery_score ?? undefined} />
                  <ScoreBar label="Value" value={expertScore.value_score ?? undefined} />
                </div>
              </TabsContent>
            )}

            {model.overview_content && (
              <TabsContent value="overview">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: model.overview_content }} />
              </TabsContent>
            )}

            <TabsContent value="emi">
              <EmiSection modelId={model.id} defaultPrice={defaultPrice} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function EmiSection({ modelId, defaultPrice }: { modelId: string; defaultPrice?: VariantPrice }) {
  const { data: emis } = useQuery({
    queryKey: ['model_emi', modelId],
    queryFn: () => mobileMasterService.getModelEmi(modelId),
    staleTime: 5 * 60 * 1000,
  });

  if (!emis?.length) {
    return <p className="text-muted-foreground text-sm">No EMI plans configured for this model.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Monthly EMI options from Nepal banks and finance companies.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {emis.map(e => (
          <div key={e.id} className="rounded-xl border p-4 space-y-1">
            <div className="text-sm text-muted-foreground">Monthly Payment</div>
            <div className="text-2xl font-bold">NPR {e.monthly_amount.toLocaleString()}</div>
            {e.down_payment > 0 && <div className="text-sm">Down payment: NPR {e.down_payment.toLocaleString()}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ModelDetailPage.tsx
git commit -m "feat: add ModelDetailPage with gallery, variant picker, expert score, specs, EMI"
```

---

## Task 9: Routing + redirects

**Files:**
- Modify: `src/routes/publicRoutes.tsx`

- [ ] **Step 1: Add lazy imports**

In `publicRoutes.tsx`, after existing mobile imports add:

```typescript
const MobileCategoryPage = lazy(() => import("@/pages/MobileCategoryPage"));
const MobileBrandPage = lazy(() => import("@/pages/MobileBrandPage"));
const ModelDetailPage = lazy(() => import("@/pages/ModelDetailPage"));
```

- [ ] **Step 2: Add new routes + redirects**

In the JSX route list, find:

```tsx
<Route path="/mobile-price" element={withSuspense(MobilePrice)} />
<Route path="/mobile-price/brand/:brand" element={withSuspense(MobilePriceBrand)} />
```

Replace with:

```tsx
{/* New cat routes */}
<Route path="/cat/mobiles/" element={withSuspense(MobileCategoryPage)} />
<Route path="/cat/mobiles/:brand" element={withSuspense(MobileBrandPage)} />
{/* Redirects from old routes */}
<Route path="/mobile-price" element={<Navigate to="/cat/mobiles/" replace />} />
<Route path="/mobile-price/brand/:brand" element={<RedirectBrandToNew />} />
```

- [ ] **Step 3: Add RedirectBrandToNew helper before the route JSX**

In `publicRoutes.tsx`, add this small component after imports:

```typescript
import { Navigate, useParams } from "react-router-dom";

function RedirectBrandToNew() {
  const { brand } = useParams<{ brand: string }>();
  return <Navigate to={`/cat/mobiles/${brand ?? ''}`} replace />;
}
```

- [ ] **Step 4: Replace ModelHub route with ModelDetailPage**

Find: `<Route path="/mobile/:slug" element={withSuspense(ModelHub)} />`

Replace with: `<Route path="/mobile/:slug" element={withSuspense(ModelDetailPage)} />`

Note: Keep ModelHub.tsx file — just not routed anymore. Do not delete it.

- [ ] **Step 5: Ensure Navigate is imported**

Check that `import { Navigate } from "react-router-dom";` exists in publicRoutes.tsx. If not, add it.

- [ ] **Step 6: Type-check + build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

Expected: 0 type errors, build success.

- [ ] **Step 7: Commit**

```bash
git add src/routes/publicRoutes.tsx
git commit -m "feat: add /cat/mobiles/ routes, redirect old /mobile-price/ paths, wire ModelDetailPage"
```

---

## Task 10: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manual checklist**

Visit each URL in browser:

| URL | Expected |
|---|---|
| `http://localhost:5173/cat/mobiles/` | Grid of phones, filter chips, brand badges |
| `http://localhost:5173/cat/mobiles/apple` | Apple-filtered grid, brand hero |
| `http://localhost:5173/mobile-price` | Redirects to `/cat/mobiles/` |
| `http://localhost:5173/mobile-price/brand/samsung` | Redirects to `/cat/mobiles/samsung` |
| `http://localhost:5173/mobile/[any-slug]` | ModelDetailPage (not ModelHub) |
| `http://localhost:5173/suadmin/emi-plans` | EmiPlanManager CRUD table |
| `http://localhost:5173/suadmin/master-data` → pick any model → Connections tab | See Prices, Expert Score, Gallery, EMI sections |

- [ ] **Step 3: Final type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete mobile price hub — category, brand, detail pages + admin extensions"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| `/cat/mobiles/` with filters, brand chips, SEO | Task 6 ✓ |
| `/cat/mobiles/:brand/` with brand intro | Task 7 ✓ |
| `/mobile/:slug/` full detail page | Task 8 ✓ |
| `phone_variant_prices` single price source | Task 1 ✓ |
| `price_history` trigger | Task 1 ✓ |
| `expert_scores` table | Task 1 ✓ |
| `model_images` gallery | Task 1 ✓ |
| `emi_plans` + `model_emi` | Task 1 ✓ |
| `retailers` table | Task 1 ✓ |
| ALTER `phone_models` + `phone_specs` | Task 1 ✓ |
| Extend `mobileMasterService.ts` | Task 2 ✓ |
| Admin: Prices tab in MobileMasterManager | Task 3 ✓ |
| Admin: Expert Score tab | Task 3 ✓ |
| Admin: Gallery tab | Task 3 ✓ |
| Admin: EMI tab | Task 3 ✓ |
| EmiPlanManager new page | Task 4 ✓ |
| `ModelCard` shared component | Task 5 ✓ |
| Old `/mobile-price/` redirects | Task 9 ✓ |
| No duplicate admin pages | Tasks 3–4: extend existing, only 1 new page ✓ |

### Type consistency check

- `ModelListItem` defined in Task 2, consumed by `ModelCard` (Task 5) and page components (Tasks 6–7) ✓
- `ModelDetail` returned by `getModelDetail()` (Task 2), consumed by `ModelDetailPage` (Task 8) ✓
- `VariantPrice`, `ExpertScore`, `ModelImage`, `EmiPlan`, `ModelEmi` defined in Task 2, imported in Task 3 editor components ✓
- `EmiSection` receives `modelId: string` and `defaultPrice?: VariantPrice` — both defined ✓

### No placeholder scan

All steps contain actual code. No "TBD", "TODO", "handle edge cases", or "similar to Task N" phrases found.
