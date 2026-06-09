# Mobile Price Hub — Design Spec
**Date:** 2026-06-09  
**Project:** Tamrakar Complex  
**Scope:** GSMArena-style mobile price hub — 3 public pages + DB extensions + admin enhancements

---

## 1. Goals

Build a Nepal-first mobile price intelligence system on top of the existing master mobile DB.  
Single source of truth for prices. Zero duplication in admin. Full SEO per page.

---

## 2. Public Routes (New)

| Route | Page | Description |
|---|---|---|
| `/cat/mobiles/` | `MobileCategoryPage` | Main hub: filters, brand price tables, popular chips, SEO content |
| `/cat/mobiles/:brand/` | `MobileBrandPage` | Brand-scoped listing, brand intro, SEO content |
| `/mobile/:slug/` | `ModelDetailPage` | Full model page: gallery, variants, price, specs, expert score, EMI, reviews, buy |

Old routes `/mobile-price/` and `/mobile-price/:brand/` redirect 301 → new `/cat/` routes.

---

## 3. Database Changes

### 3a. ALTER existing tables

```sql
-- phone_models: add metadata + SEO columns
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

-- phone_specs: add key_specs highlight + expert_rating
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS key_specs JSONB;
ALTER TABLE phone_specs ADD COLUMN IF NOT EXISTS expert_rating NUMERIC(3,1);
```

### 3b. New tables

**`phone_variant_prices`** — master price, single source of truth
```sql
CREATE TABLE phone_variant_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL,
  regular_price INTEGER NOT NULL,
  sale_price INTEGER,
  currency TEXT DEFAULT 'NPR',
  buy_url TEXT,
  stock_status TEXT DEFAULT 'in_stock',  -- in_stock | out_of_stock | pre_order
  emi_available BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`price_history`** — immutable log, trigger-populated
```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`expert_scores`** — one row per model
```sql
CREATE TABLE expert_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE UNIQUE,
  design_score NUMERIC(3,1),
  display_score NUMERIC(3,1),
  performance_score NUMERIC(3,1),
  software_score NUMERIC(3,1),
  camera_score NUMERIC(3,1),
  battery_score NUMERIC(3,1),
  value_score NUMERIC(3,1),
  overall_score NUMERIC(3,1) GENERATED ALWAYS AS (
    ROUND(((COALESCE(design_score,0) + COALESCE(display_score,0) + COALESCE(performance_score,0)
      + COALESCE(software_score,0) + COALESCE(camera_score,0) + COALESCE(battery_score,0)
      + COALESCE(value_score,0)) / NULLIF(
        (CASE WHEN design_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN display_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN performance_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN software_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN camera_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN battery_score IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN value_score IS NOT NULL THEN 1 ELSE 0 END), 0))::NUMERIC, 1)
  ) STORED,
  review_post_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`model_images`** — per-model gallery
```sql
CREATE TABLE model_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`model_user_reviews`** — user-submitted, moderated
```sql
CREATE TABLE model_user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT DEFAULT 'pending',  -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`emi_plans`** — bank/NBFC plans
```sql
CREATE TABLE emi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  processing_fee NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`model_emi`** — computed EMI per model+variant+plan
```sql
CREATE TABLE model_emi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES phone_models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES phone_variants(id) ON DELETE CASCADE,
  emi_plan_id UUID REFERENCES emi_plans(id) ON DELETE CASCADE,
  monthly_amount INTEGER NOT NULL,
  down_payment INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`retailers`** — partner stores / affiliate networks
```sql
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  is_affiliate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Frontend Components

### MobileCategoryPage (`/cat/mobiles/`)
- SEO meta: "Mobile Price in Nepal 2026 | Tamrakar Complex"
- Popular filter chips: iPhones, Under Rs.80k, Upcoming, Budget, Top Rated
- Filter sidebar: brand checkboxes + price slider
- Sort: Latest | Price ↑ | Price ↓ | Expert Rating
- Brand price tables (accordion): one per brand showing model → lowest variant price
- Product grid: `ModelCard` components
- SEO article section: buying guide + FAQ

### MobileBrandPage (`/cat/mobiles/:brand/`)
- Brand hero: logo + tagline + color
- Active filter chip: "Brand: Samsung"
- Same filter/sort as category
- Brand description paragraph
- Model grid filtered to brand
- SEO section: brand overview + series + FAQ

### ModelDetailPage (`/mobile/:slug/`)
- Breadcrumb: Home → Mobiles → Brand → Model
- Gallery: `model_images` carousel + thumbnail strip
- Title + key specs bar (6 highlighted)
- Variant picker → price updates reactively
- Expert rating badge + score breakdown (7 sub-scores)
- Stock status + EMI teaser
- Buy button → opens offers sheet (retailer links)
- EMI calculator (select plan → see monthly)
- Full specs table (from `phone_specs.full_specs_json` grouped by category)
- Overview article (`phone_models.overview_content` rendered as rich text)
- User reviews section (approved only, submit form)
- Price history chart (sparkline from `price_history`)
- Related phones (same brand/series)

### ModelCard (shared component)
- GSMArena-style: image | name | key specs row | price | condition badge

---

## 5. Admin Changes (NO new pages — extend existing)

### MobileMasterManager — new tabs in model editor dialog

Current tabs: Brands | Series | Models | Variants  
Add inside model edit dialog:

| New Tab | Contents |
|---|---|
| **Prices** | Variant prices table: regular_price, sale_price, stock_status, buy_url, retailer, is_default. Inline edit. Price history link. |
| **Expert Score** | 7 score sliders (0–10, step 0.1) + auto-computed overall. Review post slug field. |
| **Gallery** | Image URL list with sort_order + is_featured toggle. Drag-to-reorder. |
| **EMI** | Select variant + plan → set monthly_amount. |

### New `EmiPlanManager` admin page
- Manage `emi_plans` table (bank, months, rate, fee)
- Simple CRUD table
- Added to admin sidebar under "Prices" group

### No changes to: BrandManager, PriceListManager, CategoryManager, ProductManager

---

## 6. Price Integrity Rules

1. `phone_variant_prices` is the ONLY price source
2. Category, brand, and detail pages all JOIN through `phone_variant_prices`
3. DB trigger: `AFTER UPDATE ON phone_variant_prices → INSERT INTO price_history`
4. Admin variant price editor shows price_history inline (last 5 changes)
5. `sale_price` NULL means no sale; use `regular_price`

---

## 7. Service Layer

Extend `src/services/mobileMasterService.ts`:
- `getModelDetail(slug)` — full JOIN: model + variants + prices + specs + images + expert_scores
- `getModelsByBrand(brandSlug, filters)` — paginated
- `getModelsByCategory(filters)` — paginated  
- `upsertVariantPrice(data)` — sets price, triggers history
- `upsertExpertScore(data)`
- `addModelImage(data)` / `reorderModelImages(ids)`
- `getModelReviews(modelId)` / `submitReview(data)`
- `getEmiPlans()` / `upsertEmiPlan(data)`

No new service files — all in `mobileMasterService.ts`.

---

## 8. Routing (App.tsx additions)

```tsx
<Route path="/cat/mobiles/" element={<MobileCategoryPage />} />
<Route path="/cat/mobiles/:brand" element={<MobileBrandPage />} />
<Route path="/mobile/:slug" element={<ModelDetailPage />} />
{/* Redirects */}
<Route path="/mobile-price" element={<Navigate to="/cat/mobiles/" replace />} />
<Route path="/mobile-price/:brand" element={<RedirectBrandSlug />} />
```

---

## 9. Execution Order

1. DB migration (ALTER + new tables + trigger + RLS)
2. Extend `mobileMasterService.ts`
3. Admin: new tabs in MobileMasterManager + EmiPlanManager page
4. Frontend: ModelCard component
5. Frontend: MobileCategoryPage
6. Frontend: MobileBrandPage
7. Frontend: ModelDetailPage
8. Routing + redirects
9. Build verification + type check
