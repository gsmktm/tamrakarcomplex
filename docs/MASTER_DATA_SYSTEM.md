# Master Mobile Data System — Complete Documentation

**Last Updated:** May 13, 2026  
**URL:** `/suadmin/master-data`  
**Component:** `src/pages/admin/MobileMasterManager.tsx`  
**Service:** `src/services/mobileMasterService.ts`  
**Status:** ✅ Production Ready

---

## 📚 System Overview

The Master Mobile Data System is the centralized database for all mobile phone information in Tamrakar Complex. It follows a **hierarchical structure** where:

```
Brand (e.g., Apple)
  ├── Series (Optional, e.g., iPhone 15)
  │   └── Model (e.g., iPhone 15 Pro Max)
  │       ├── Variants (RAM/Storage/Color combos)
  │       ├── Specifications (Display, Processor, etc.)
  │       ├── Inventory (New phone stock)
  │       ├── Exchange Values (Trade-in prices)
  │       ├── Unlocking Services
  │       ├── Repair Services
  │       └── Accessories
  └── Model (Direct, no series)
```

**Key Principle:** `One Model = One ID = Whole System Connection`

All system modules (inventory, repair, exchange, etc.) reference a single `model_id`, ensuring data consistency across the platform.

---

## 🗄️ Data Models

### 1. Brand

**Table:** `brands`  
**Purpose:** Manufacturer brands (Apple, Samsung, Xiaomi, etc.)

```typescript
interface Brand {
  id: string;              // UUID
  name: string;            // e.g., "Apple"
  slug: string;            // e.g., "apple" (unique)
  logo?: string;           // Optional: URL to brand logo
  status: string;          // "active", "archived"
  created_at: timestamp;
  updated_at: timestamp;
}
```

**API Functions:**
- `getBrands()` — List all brands
- `createBrand(brand)` — Add new brand
- `updateBrand(id, brand)` — Edit brand
- `deleteBrand(id)` — Delete brand (fails if models exist)

### 2. Phone Series

**Table:** `phone_series`  
**Purpose:** Product lines within a brand (iPhone, Galaxy S, Galaxy A, etc.)

```typescript
interface PhoneSeries {
  id: string;              // UUID
  brand_id: string;        // Reference to brands.id
  name: string;            // e.g., "iPhone 15"
  slug: string;            // e.g., "iphone-15" (unique)
  status: string;          // "active", "archived"
  created_at: timestamp;
  updated_at: timestamp;
}
```

**API Functions:**
- `getSeriesByBrand(brandId)` — List series for a brand
- `createSeries(series)` — Add new series to brand
- `updateSeries(id, series)` — Edit series
- `deleteSeries(id)` — Delete series (fails if models exist)

**Note:** Series is optional. Models can belong directly to a brand without a series.

### 3. Phone Model

**Table:** `phone_models`  
**Purpose:** Individual phone models (iPhone 15 Pro Max, Galaxy S25 Ultra, etc.)

```typescript
interface PhoneModel {
  id: string;              // UUID — PRIMARY KEY for all modules
  brand_id: string;        // Reference to brands.id
  series_id?: string;      // Optional: Reference to phone_series.id
  name: string;            // e.g., "iPhone 15 Pro Max"
  slug: string;            // e.g., "iphone-15-pro-max" (unique)
  model_number?: string;   // e.g., "A3106"
  release_year?: number;   // e.g., 2023
  image?: string;          // Model image URL
  status: string;          // "active", "archived"
  search_keywords?: string; // For search optimization
  created_at: timestamp;
  updated_at: timestamp;
}
```

**API Functions:**
- `getModels(brandId?, seriesId?)` — List models (optional filters)
- `searchModels(searchTerm)` — Search models by name (limit 10)
- `createModel(model)` — Add new model
- `updateModel(id, model)` — Edit model
- `deleteModel(id)` — Delete model

### 4. Phone Variant

**Table:** `phone_variants`  
**Purpose:** Configuration combinations for a model (RAM/Storage/Color)

```typescript
interface PhoneVariant {
  id: string;              // UUID
  model_id: string;        // Reference to phone_models.id
  ram?: string;            // e.g., "8GB", "12GB"
  storage?: string;        // e.g., "256GB", "512GB"
  color?: string;          // e.g., "Black", "Titanium Blue"
  region?: string;         // e.g., "Global", "Asia Pacific"
  condition_type: string;  // "new", "refurbished", "used"
  status: string;          // "active", "archived"
  created_at: timestamp;
  updated_at: timestamp;
}
```

**API Functions:**
- `getVariants(modelId)` — List all variants for a model
- `createVariant(variant)` — Add variant to model
- `deleteVariant(id)` — Remove variant

**Use Cases:**
- Create "8GB + 256GB + Black" variant
- Create "12GB + 512GB + Gold" variant
- Track refurbished vs. new condition variants

### 5. Phone Specification

**Table:** `phone_specs`  
**Purpose:** Technical specifications, reviews, and highlights

```typescript
interface PhoneSpec {
  id: string;              // UUID
  model_id: string;        // Reference to phone_models.id (UNIQUE)
  display?: string;        // e.g., "6.7-inch Super Retina XDR"
  processor?: string;      // e.g., "A17 Pro Chip"
  camera?: string;         // e.g., "48MP Main, 12MP Ultra Wide"
  battery?: string;        // e.g., "4422 mAh"
  charging?: string;       // e.g., "25W Wired, MagSafe"
  os?: string;             // e.g., "iOS 17"
  network?: string;        // e.g., "5G, Wi-Fi 7"
  body?: string;           // e.g., "Titanium design, IP68"
  pros?: string[];         // Reasons to buy
  cons?: string[];         // Reasons to avoid
  verdict?: string;        // Expert review summary
  highlights?: object;     // Key highlights JSON
  full_specs_json?: object; // Complete specifications JSON
  created_at: timestamp;
  updated_at: timestamp;
}
```

**API Functions:**
- `getSpecs(modelId)` — Get specifications for model
- `upsertSpecs(specs)` — Create or update specifications

**Note:** One-to-one relationship with models. Stores rich content for product pages.

---

## 🔗 Connected Modules (One Model = Multiple Uses)

When a model is created, it can be connected to:

### 1. **Inventory Items** (New Phone Stock)
Link: `/suadmin/products?modelId={modelId}`
- Track new phone stock from stores
- Manage pricing by store and variant
- Monitor stock levels and warehouse allocation

### 2. **Exchange Values** (Trade-in Prices)
Link: `/admin/exchange?modelId={modelId}`
- Set trade-in price ranges
- Grade-based valuation (Excellent, Good, Fair, Poor)
- Store-specific pricing rules

### 3. **Repair Services**
Link: `/admin/repairs?modelId={modelId}`
- Link repair parts and labor costs
- Define service time estimates
- Manage parts inventory

### 4. **Unlocking Services**
Link: `/admin/unlocking?modelId={modelId}`
- Configure carrier unlocking options
- Set service prices
- Track network unlock capability

### 5. **Accessories**
Link: `/admin/accessories?modelId={modelId}`
- Link compatible cases, chargers, protectors
- Define accessory bundles
- Track accessory stock

### 6. **SEO & Content**
Link: `/admin/seo?modelId={modelId}`
- Auto-generate landing page content
- Create product comparison pages
- Build search optimization

---

## 🎨 UI Components & Features

### Main Component: `MobileMasterManager`

**Location:** `src/pages/admin/MobileMasterManager.tsx`

#### Tabs

1. **Brands Tab**
   - Grid view of all brands with logos
   - Add brand dialog
   - Edit brand inline
   - Delete with cascading check
   - Brand selection navigation

2. **Series Tab**
   - Shows series for selected brand
   - Add series to brand
   - Delete series (if no models)
   - Series selection navigation

3. **Models Tab**
   - Table view of all models
   - Filter by brand and series
   - Search by model name
   - Add model dialog
   - Edit model inline
   - Delete model
   - Quick access to specifications and variants

4. **Connections Tab**
   - Model-specific settings
   - Links to all connected modules
   - Specifications editor
   - Variant manager

#### State Management

```typescript
activeTab: string;           // "brands" | "series" | "models" | "connections"
selectedBrandId: string;     // Current brand filter
selectedSeriesId: string;    // Current series filter
selectedModelId: string;     // Current model for connections
```

#### Data Flow

1. **Query Layer** (React Query)
   - `master_brands` — All brands
   - `master_series-{brandId}` — Series for brand
   - `master_models-{brandId}-{seriesId}` — Models
   - `model_variants-{modelId}` — Variants for model
   - `model_specs-{modelId}` — Specifications

2. **Mutation Layer**
   - Brand CRUD (create, read, update, delete)
   - Series CRUD
   - Model CRUD
   - Variant add/delete
   - Spec upsert

3. **Error Handling**
   - Toast notifications on success/error
   - Confirmation dialogs for deletion
   - Cascade checks on delete

---

## 📝 Add/Edit Features — Complete Flow

### Adding a Brand

**Flow:**
1. User clicks "Add Brand" button
2. Dialog opens with "Brand Name" input
3. User enters brand name (e.g., "Apple")
4. System auto-slugifies (e.g., "apple")
5. User clicks "Create Brand"
6. `createBrand` mutation fires
7. Query cache invalidates → UI updates
8. Toast notification shows success

**Code Location:** `AddBrandDialog` component (line ~422)

**Enhancement Opportunities:**
- [ ] Add logo upload field
- [ ] Add brand description
- [ ] Set visibility/status before saving
- [ ] Batch import brands from CSV

### Editing a Brand

**Flow:**
1. User hovers over brand card → edit pencil appears
2. User clicks pencil icon
3. Edit dialog opens with current name
4. User modifies name
5. User clicks "Save Changes"
6. `updateBrand` mutation fires
7. Query cache invalidates
8. Toast shows success

**Code Location:** `EditBrandDialog` component (line ~460)

**Enhancement Opportunities:**
- [ ] Edit logo/description
- [ ] Change brand status (active/archived)
- [ ] Merge duplicate brands
- [ ] View brand statistics

### Adding a Series

**Flow:**
1. User selects brand
2. Clicks "Add Series" button (only enabled if brand selected)
3. Dialog opens with series name input
4. System auto-slugifies name
5. User clicks "Create Series"
6. `createSeries` mutation fires with `brand_id`
7. Series list updates

**Code Location:** `AddSeriesDialog` component (line ~490)

**Enhancement Opportunities:**
- [ ] Add series description
- [ ] Link to brand logo/branding
- [ ] Set launch date
- [ ] Add series image

### Adding a Model

**Flow:**
1. User can start from models tab or series tab
2. Clicks "Add Model" button
3. Dialog opens with:
   - Brand selector (pre-filled if from series)
   - Series selector (optional, pre-filled)
   - Model name input
   - Model number input
   - Release year input
4. User fills fields
5. Clicks "Create Model"
6. `createModel` mutation fires
7. Models list updates
8. New model appears in list

**Code Location:** `AddModelDialog` component (line ~513)

**Data Saved:**
```javascript
{
  name: "iPhone 15 Pro Max",
  brand_id: "uuid...",
  series_id: "uuid...",
  model_number: "A3106",
  release_year: 2023,
  slug: "iphone-15-pro-max",
  status: "active"
}
```

**Enhancement Opportunities:**
- [ ] Add model image upload
- [ ] Add initial specifications
- [ ] Add search keywords
- [ ] Quick-add variants after model creation

### Editing a Model

**Flow:**
1. User hovers over model row
2. Clicks edit (pencil) icon
3. Edit dialog opens with current values
4. User modifies any field:
   - Brand
   - Series (optional)
   - Model name
   - Model number
   - Release year
5. Clicks "Update Model"
6. `updateModel` mutation fires
7. List updates

**Code Location:** `EditModelDialog` component (line ~536)

**Enhancement Opportunities:**
- [ ] Upload/change model image
- [ ] Edit all specs inline
- [ ] Change model status
- [ ] View variant count
- [ ] Quick-link to inventory

### Managing Variants

**Flow:**
1. User selects model
2. Clicks "Manage Variants" (in Connections tab)
3. Dialog opens showing:
   - Current variants in table
   - Form to add new variant (RAM, Storage, Color)
4. User fills add form
5. Clicks "Add"
6. `createVariant` mutation fires
7. Variant appears in table
8. User can delete variants one by one

**Code Location:** `VariantEditor` component (line ~625)

**Current Limitations:**
- ❌ Can't edit existing variants
- ❌ No bulk import
- ❌ No color picker (text only)
- ❌ No region management

### Managing Specifications

**Flow:**
1. User selects model
2. Clicks "Edit Specs & Overview"
3. Dialog opens with specification form fields:
   - Display
   - Processor
   - Camera
   - Battery
   - Charging
   - OS
   - Pros (comma-separated)
   - Cons (comma-separated)
   - Expert Verdict
4. User fills fields
5. Clicks "Save Specifications"
6. `upsertSpecs` mutation fires
7. Specs saved (create or update)

**Code Location:** `SpecEditor` component (line ~763)

**Data Saved:**
```javascript
{
  model_id: "uuid...",
  display: "6.7-inch Super Retina XDR",
  processor: "A17 Pro Chip",
  camera: "48MP Main, 12MP Ultra Wide",
  battery: "4422 mAh",
  charging: "25W Wired, MagSafe",
  os: "iOS 17",
  pros: ["Titanium design", "Powerful zoom", "USB-C"],
  cons: ["Expensive", "Slow charging"],
  verdict: "The best iPhone for professionals..."
}
```

**Enhancement Opportunities:**
- [ ] Add network specs field
- [ ] Add body material field
- [ ] Add highlights/key features
- [ ] Rich text editor for verdict
- [ ] Image/video specs support

---

## 🔧 Service Functions — Complete API

**File:** `src/services/mobileMasterService.ts`

### Brand Operations

```typescript
// Get all brands
getBrands(): Promise<Brand[]>

// Create new brand
createBrand(data: { name: string, slug: string }): Promise<Brand>

// Update brand
updateBrand(id: string, data: Partial<Brand>): Promise<Brand>

// Delete brand (fails if models exist)
deleteBrand(id: string): Promise<void>
```

### Series Operations

```typescript
// Get series for a brand
getSeriesByBrand(brandId: string): Promise<PhoneSeries[]>

// Create new series
createSeries(data: { brand_id: string, name: string, slug: string }): Promise<PhoneSeries>

// Update series
updateSeries(id: string, data: Partial<PhoneSeries>): Promise<PhoneSeries>

// Delete series (fails if models exist)
deleteSeries(id: string): Promise<void>
```

### Model Operations

```typescript
// Get models (optional filters)
getModels(brandId?: string, seriesId?: string): Promise<PhoneModel[]>

// Search models by name
searchModels(searchTerm: string): Promise<PhoneModel[]>

// Create new model
createModel(data: Partial<PhoneModel>): Promise<PhoneModel>

// Update model
updateModel(id: string, data: Partial<PhoneModel>): Promise<PhoneModel>

// Delete model
deleteModel(id: string): Promise<void>
```

### Variant Operations

```typescript
// Get variants for model
getVariants(modelId: string): Promise<PhoneVariant[]>

// Create variant
createVariant(data: Partial<PhoneVariant>): Promise<PhoneVariant>

// Delete variant
deleteVariant(id: string): Promise<void>
```

### Specification Operations

```typescript
// Get specs for model
getSpecs(modelId: string): Promise<PhoneSpec | null>

// Create or update specs (upsert)
upsertSpecs(data: Partial<PhoneSpec>): Promise<PhoneSpec>
```

### Module Connection Operations

```typescript
// Update inventory item
updateInventory(item: any): Promise<void>

// Update exchange value
updateExchangeValue(value: any): Promise<void>

// Update repair service
updateRepairService(service: any): Promise<void>

// Update unlocking service
updateUnlockingService(service: any): Promise<void>
```

---

## 📊 Database Schema Summary

### Tables

| Table | Purpose | Key Relations |
|-------|---------|----------------|
| `brands` | Brand master data | 1 → Many `phone_series`, `phone_models` |
| `phone_series` | Product line groups | Many ← 1 `brands`, 1 → Many `phone_models` |
| `phone_models` | Individual phone models | Key: ID for entire system |
| `phone_variants` | Model configurations | Many ← 1 `phone_models` |
| `phone_specs` | Technical details | 1 ← 1 `phone_models` (UNIQUE) |
| `inventory_items` | New phone stock | Many ← 1 `phone_models`, `phone_variants` |
| `exchange_values` | Trade-in pricing | Many ← 1 `phone_models`, `phone_variants` |
| `repair_services` | Repair options | Many ← 1 `phone_models` |
| `unlocking_services` | Unlock services | Many ← 1 `phone_models` |
| `accessories` | Compatible accessories | Many ← 1 `phone_models` |

### Indexes (Recommended)

```sql
-- Already exist or should be added for performance:
CREATE INDEX idx_phone_models_brand_id ON phone_models(brand_id);
CREATE INDEX idx_phone_models_series_id ON phone_models(series_id);
CREATE INDEX idx_phone_models_slug ON phone_models(slug);
CREATE INDEX idx_phone_variants_model_id ON phone_variants(model_id);
CREATE INDEX idx_phone_series_brand_id ON phone_series(brand_id);
```

---

## ✨ Recommended Enhancements

### Short-term (High Priority)

1. **Edit Variants Feature**
   - Allow editing existing variants (not just delete/recreate)
   - Bulk variant import (CSV)
   - Variant templates (e.g., "Standard", "Pro", "Ultra")

2. **Image Management**
   - Model image upload
   - Brand logo upload
   - Variant/color image preview

3. **Import/Export**
   - CSV import for brands, series, models
   - Export all data to CSV/JSON
   - Duplicate detection and merge

4. **Search & Filter**
   - Full-text search on models
   - Advanced filters (year range, processor type)
   - Saved filters

5. **Bulk Operations**
   - Bulk edit status (active/archived)
   - Bulk assign series to models
   - Bulk create inventory items

### Medium-term (Medium Priority)

1. **Rich Specifications**
   - WYSIWYG editor for verdict/pros/cons
   - Structured specification schema
   - Comparison generator

2. **Variant Management**
   - Color picker instead of text
   - Variant templates and presets
   - One-click duplicate variant

3. **Integration Features**
   - Link to external specs (GS Arena, Phone Arena)
   - Auto-fetch specifications
   - Price history tracking

4. **Analytics**
   - Most viewed models
   - Popular variants
   - Inventory turnover

### Long-term (Lower Priority)

1. **AI Features**
   - Auto-generate specifications from images
   - Intelligent duplicate detection
   - SEO content generation

2. **Marketplace Integration**
   - Real-time pricing from retailers
   - Automatic inventory sync
   - Competitor price tracking

3. **Multi-language Support**
   - Translate specs to multiple languages
   - Regional variant management

---

## 🚀 Usage Examples

### Create Complete Model with Variants

```typescript
// Step 1: Create brand
const brand = await mobileMasterService.createBrand({
  name: "Apple",
  slug: "apple"
});

// Step 2: Create series
const series = await mobileMasterService.createSeries({
  brand_id: brand.id,
  name: "iPhone 15",
  slug: "iphone-15"
});

// Step 3: Create model
const model = await mobileMasterService.createModel({
  brand_id: brand.id,
  series_id: series.id,
  name: "iPhone 15 Pro Max",
  slug: "iphone-15-pro-max",
  model_number: "A3106",
  release_year: 2023
});

// Step 4: Add variants
await mobileMasterService.createVariant({
  model_id: model.id,
  ram: "8GB",
  storage: "256GB",
  color: "Black"
});

await mobileMasterService.createVariant({
  model_id: model.id,
  ram: "12GB",
  storage: "512GB",
  color: "Titanium Blue"
});

// Step 5: Add specifications
await mobileMasterService.upsertSpecs({
  model_id: model.id,
  display: "6.7-inch Super Retina XDR",
  processor: "A17 Pro Chip",
  camera: "48MP Main, 12MP Ultra Wide",
  battery: "4422 mAh",
  charging: "25W Wired, MagSafe",
  os: "iOS 17",
  pros: ["Titanium design", "Powerful zoom", "USB-C"],
  cons: ["Expensive", "Slow charging"],
  verdict: "Best professional iPhone"
});
```

---

## 🔐 Access Control

**Role:** Super Admin Only (`suadmin`)  
**Route:** `/suadmin/master-data`  
**Permission:** Full CRUD on all master data

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Can't delete a brand**  
A: Models exist under this brand. Delete/reassign models first.

**Q: Model variants not showing**  
A: Query may not be enabled. Check `enabled: open` in VariantEditor.

**Q: Specifications not saving**  
A: Check that model_id is provided. Each model can have only one spec record.

**Q: Search not working**  
A: Use exact model names or partial matches. Limited to 10 results.

---

## 📄 Related Documentation

- [README.md](../README.md) — Project overview
- [DEPLOYMENT.md](../DEPLOYMENT.md) — Deployment guide
- [docs/AI_DATA_MODEL.md](./AI_DATA_MODEL.md) — Database schema reference
- [docs/AI_FUNCTION_INDEX.md](./AI_FUNCTION_INDEX.md) — All hooks and services

---

**Last Updated:** May 13, 2026  
**Maintained By:** Development Team
