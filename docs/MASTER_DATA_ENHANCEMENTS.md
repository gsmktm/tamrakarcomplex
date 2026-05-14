# Master Data System — Add/Edit Features Enhancement Guide

**Created:** May 13, 2026  
**Purpose:** Complete roadmap for enhancing master-data CRUD operations  
**Status:** Planning Phase

---

## 🎯 Current State Analysis

### What Works ✅

1. **Add Brand** — Simple text input, auto-slug
2. **Edit Brand** — Inline edit dialog with name change
3. **Delete Brand** — With cascade check
4. **Add Series** — Requires brand selection
5. **Delete Series** — With cascade check
6. **Add Model** — Full form (brand, series, name, number, year)
7. **Edit Model** — All fields editable
8. **Delete Model** — Simple deletion
9. **Add Variant** — RAM/Storage/Color inputs
10. **Delete Variant** — Individual deletion
11. **Add/Edit Specs** — Comprehensive specification form

### What's Missing ❌

1. **Edit Variant** — Can only delete and recreate
2. **Bulk Operations** — No CSV import/export
3. **Image Upload** — No logo, model, or color image support
4. **Duplicate Detection** — No smart merge
5. **Advanced Filtering** — No year range, brand filters
6. **Inline Editing** — Must use dialogs (not inline cells)
7. **Status Management** — Can't easily archive/unarchive
8. **Batch Operations** — No bulk status change
9. **Validation** — Limited pre-save validation
10. **Rich Editing** — No WYSIWYG for specs

---

## 📋 Enhancement Roadmap

### Phase 1: Critical (Week 1)

#### 1.1 Edit Variant Feature

**Current:** Users must delete variant and recreate it  
**Enhancement:** Allow direct editing of variant properties

**Implementation Steps:**

1. Modify `mobileMasterService.ts`:
```typescript
async updateVariant(id: string, variant: Partial<PhoneVariant>) {
  const { data, error } = await supabase
    .from('phone_variants')
    .update(variant)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

2. Update `MobileMasterManager.tsx` - VariantEditor component:
```typescript
function VariantEditor({ modelId }: { modelId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => 
      mobileMasterService.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model_variants", modelId] });
      toast.success("Variant updated");
      setEditingId(null);
    }
  });

  return (
    <TableRow key={v.id}>
      {editingId === v.id ? (
        <>
          <TableCell>
            <Input 
              value={editFormData.ram} 
              onChange={e => setEditFormData({...editFormData, ram: e.target.value})}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input 
              value={editFormData.storage} 
              onChange={e => setEditFormData({...editFormData, storage: e.target.value})}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input 
              value={editFormData.color} 
              onChange={e => setEditFormData({...editFormData, color: e.target.value})}
              className="h-8"
            />
          </TableCell>
          <TableCell className="text-right gap-1 flex">
            <Button 
              size="icon" 
              className="h-7 w-7"
              onClick={() => updateMutation.mutate({ id: v.id, data: editFormData })}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost"
              size="icon" 
              className="h-7 w-7"
              onClick={() => setEditingId(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="py-2 text-sm font-medium">{v.ram || '-'}</TableCell>
          <TableCell className="py-2 text-sm">{v.storage || '-'}</TableCell>
          <TableCell className="py-2 text-sm">{v.color || '-'}</TableCell>
          <TableCell className="py-2 text-right flex gap-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => {
                setEditingId(v.id);
                setEditFormData(v);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-red-500" 
              onClick={() => {
                if (confirm("Delete variant?")) {
                  deleteMutation.mutate(v.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
```

**Files to Modify:**
- `src/services/mobileMasterService.ts` — Add `updateVariant` function
- `src/pages/admin/MobileMasterManager.tsx` — Update VariantEditor component

**Time Estimate:** 2 hours  
**Testing:** Unit test variant edit, integration test full flow

---

#### 1.2 Image Upload Support

**Current:** No image uploads (text fields only)  
**Enhancement:** Support for brand logos and model images

**Implementation Steps:**

1. Create image upload utility `src/lib/imageUpload.ts`:
```typescript
export async function uploadImage(
  file: File,
  bucket: 'brand-logos' | 'model-images' | 'variant-colors',
  path: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type
    });
    
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
    
  return urlData.publicUrl;
}
```

2. Add storage bucket migration:
```sql
-- In supabase/migrations/
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('brand-logos', 'brand-logos', true),
  ('model-images', 'model-images', true),
  ('variant-colors', 'variant-colors', true)
ON CONFLICT DO NOTHING;
```

3. Update `AddBrandDialog`:
```typescript
function AddBrandDialog({ onAdd }: { onAdd: (data: any) => void }) {
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleUpload = async () => {
    if (!logoFile) {
      onAdd({ name, slug: slugify(name) });
      setOpen(false);
      return;
    }
    
    setUploading(true);
    try {
      const logoUrl = await uploadImage(logoFile, 'brand-logos', name);
      onAdd({ name, slug: slugify(name), logo: logoUrl });
      setOpen(false);
    } catch (error) {
      toast.error("Failed to upload logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Brand</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple, Samsung" />
          </div>
          <div className="space-y-2">
            <Label>Brand Logo (Optional)</Label>
            <Input 
              type="file" 
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Brand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Files to Create/Modify:**
- `src/lib/imageUpload.ts` — NEW
- `src/pages/admin/MobileMasterManager.tsx` — Update dialogs
- `supabase/migrations/[timestamp]_add_image_buckets.sql` — NEW

**Time Estimate:** 3 hours  
**Testing:** Test image upload, public URL generation, error handling

---

#### 1.3 Input Validation & Error Handling

**Current:** Minimal validation (just required fields)  
**Enhancement:** Comprehensive client-side validation

**Implementation:**

1. Create validation utility `src/lib/masterDataValidation.ts`:
```typescript
import { z } from 'zod';

export const BrandSchema = z.object({
  name: z.string().min(1, 'Brand name required').max(100, 'Too long'),
  slug: z.string().toLowerCase().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  logo: z.string().url().optional(),
});

export const ModelSchema = z.object({
  name: z.string().min(1).max(100),
  brand_id: z.string().uuid('Invalid brand'),
  series_id: z.string().uuid().optional(),
  model_number: z.string().max(50).optional(),
  release_year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
});

export const VariantSchema = z.object({
  model_id: z.string().uuid(),
  ram: z.string().max(50).optional(),
  storage: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
});

export const SpecSchema = z.object({
  model_id: z.string().uuid(),
  display: z.string().max(200).optional(),
  processor: z.string().max(200).optional(),
  camera: z.string().max(200).optional(),
  battery: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  verdict: z.string().max(2000).optional(),
});
```

2. Use in dialogs:
```typescript
const handleCreate = async () => {
  try {
    const validated = BrandSchema.parse({ name, slug: slugify(name) });
    onAdd(validated);
  } catch (error: any) {
    toast.error(error.errors?.[0]?.message || "Validation failed");
  }
};
```

**Files to Create/Modify:**
- `src/lib/masterDataValidation.ts` — NEW
- All dialog components — Add validation

**Time Estimate:** 2 hours

---

### Phase 2: Important (Week 2)

#### 2.1 Bulk Import/Export (CSV)

**Current:** Manual entry only  
**Enhancement:** Import/export entire datasets as CSV

**CSV Format Examples:**

**Brands CSV:**
```csv
name,slug,logo_url
Apple,apple,https://...
Samsung,samsung,https://...
```

**Models CSV:**
```csv
name,brand,series,model_number,release_year
iPhone 15 Pro Max,Apple,iPhone 15,A3106,2023
Galaxy S25 Ultra,Samsung,Galaxy S25,SM-S935B,2024
```

**Variants CSV:**
```csv
model_name,ram,storage,color,region
iPhone 15 Pro Max,8GB,256GB,Black,Global
iPhone 15 Pro Max,12GB,512GB,Gold,Asia
```

**Implementation:**

1. Create import/export service `src/services/masterDataImportExport.ts`:
```typescript
import Papa from 'papaparse';

export async function importBrandsFromCSV(file: File) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const records = results.data as any[];
          for (const record of records) {
            await mobileMasterService.createBrand({
              name: record.name,
              slug: record.slug || slugify(record.name),
              logo: record.logo_url
            });
          }
          resolve(records.length);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}

export function exportBrandsToCSV(brands: Brand[]) {
  const csv = Papa.unparse(brands);
  downloadCSV(csv, 'brands.csv');
}
```

2. Add import/export dialog to UI

**Files to Create/Modify:**
- `src/services/masterDataImportExport.ts` — NEW
- `src/pages/admin/MobileMasterManager.tsx` — Add import/export buttons

**Time Estimate:** 4 hours
**Dependencies:** papaparse package (already in project)

---

#### 2.2 Bulk Status Management

**Current:** Can only change status individual via edit  
**Enhancement:** Bulk archive/activate models, series, brands

**Implementation:**

1. Add to service:
```typescript
async bulkUpdateStatus(ids: string[], table: string, status: string) {
  const { error } = await supabase
    .from(table)
    .update({ status })
    .in('id', ids);
  if (error) throw error;
}
```

2. Add bulk selection to tables:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

<Checkbox 
  checked={selectedIds.has(model.id)}
  onCheckedChange={() => {
    const newSet = new Set(selectedIds);
    newSet.has(model.id) ? newSet.delete(model.id) : newSet.add(model.id);
    setSelectedIds(newSet);
  }}
/>

{selectedIds.size > 0 && (
  <div className="flex gap-2">
    <Button onClick={() => bulkUpdateStatus(Array.from(selectedIds), 'phone_models', 'active')}>
      Activate ({selectedIds.size})
    </Button>
    <Button onClick={() => bulkUpdateStatus(Array.from(selectedIds), 'phone_models', 'archived')}>
      Archive ({selectedIds.size})
    </Button>
  </div>
)}
```

**Time Estimate:** 2 hours

---

#### 2.3 Duplicate Detection & Merge

**Current:** Manual detection  
**Enhancement:** Smart duplicate finder and merge tool

**Implementation:**

1. Create service function:
```typescript
async findDuplicateModels() {
  // Find models with similar names (case-insensitive, Levenshtein distance)
  const { data: models } = await supabase.from('phone_models').select('*');
  
  const duplicates: any[] = [];
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const similarity = calculateSimilarity(models[i].name, models[j].name);
      if (similarity > 0.8) {
        duplicates.push({ primary: models[i], duplicate: models[j], similarity });
      }
    }
  }
  return duplicates;
}

function mergeModels(primaryId: string, duplicateId: string) {
  // Merge: reassign all data from duplicate to primary, then delete duplicate
}
```

**Time Estimate:** 3 hours

---

### Phase 3: Nice-to-Have (Week 3)

#### 3.1 Rich Text Editing for Specs

**Current:** Plain textarea  
**Enhancement:** WYSIWYG editor for verdict and content

**Implementation:**
- Integrate `react-quill` or `tiptap`
- Format verdict, pros, cons as rich HTML
- Support formatting, links, lists

**Time Estimate:** 3 hours

---

#### 3.2 Color Picker for Variants

**Current:** Text input only  
**Enhancement:** Visual color picker

**Implementation:**
```typescript
import { HexColorPicker } from "react-colorful";

<HexColorPicker 
  color={color} 
  onChange={setColor} 
/>
<Input value={color} onChange={e => setColor(e.target.value)} />
```

**Time Estimate:** 1 hour

---

#### 3.3 Advanced Filtering & Search

**Current:** Simple filters  
**Enhancement:** Advanced search with multiple criteria

**Implementation:**
- Year range slider
- Multi-select brand/series
- Status filter
- Save custom filters
- Search history

**Time Estimate:** 4 hours

---

## 🛠️ Implementation Priority Matrix

| Feature | Priority | Effort | Impact | Recommended |
|---------|----------|--------|--------|-------------|
| Edit Variant | Critical | 2h | High | Week 1 |
| Image Upload | Critical | 3h | High | Week 1 |
| Input Validation | Critical | 2h | High | Week 1 |
| Bulk Import/Export | Important | 4h | Medium | Week 2 |
| Bulk Status | Important | 2h | Medium | Week 2 |
| Duplicate Detection | Important | 3h | Medium | Week 2 |
| Rich Text Editor | Nice-to-Have | 3h | Low | Week 3 |
| Color Picker | Nice-to-Have | 1h | Low | Week 3 |
| Advanced Filters | Nice-to-Have | 4h | Low | Week 3 |

---

## 📝 Implementation Checklist

### Phase 1

- [ ] Add `updateVariant` to mobileMasterService
- [ ] Update VariantEditor with edit functionality
- [ ] Create imageUpload utility
- [ ] Add storage buckets migration
- [ ] Update AddBrandDialog with image upload
- [ ] Update EditBrandDialog with image upload
- [ ] Create masterDataValidation schema
- [ ] Add validation to all dialogs
- [ ] Test all add/edit flows
- [ ] Update documentation

### Phase 2

- [ ] Create masterDataImportExport service
- [ ] Add import/export dialogs to UI
- [ ] Test CSV import/export
- [ ] Add bulk selection checkboxes
- [ ] Implement bulkUpdateStatus
- [ ] Create duplicate detection service
- [ ] Add duplicate detection UI
- [ ] Implement merge functionality

### Phase 3

- [ ] Integrate WYSIWYG editor
- [ ] Update SpecEditor component
- [ ] Add color picker library
- [ ] Update VariantEditor color input
- [ ] Implement advanced search/filters
- [ ] Add filter persistence to localStorage

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// mobileMasterService.test.ts
describe('updateVariant', () => {
  it('should update variant with new values', async () => {
    const updated = await mobileMasterService.updateVariant(variantId, {
      ram: '12GB'
    });
    expect(updated.ram).toBe('12GB');
  });
  
  it('should throw error on invalid ID', async () => {
    await expect(
      mobileMasterService.updateVariant('invalid-id', { ram: '12GB' })
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// MobileMasterManager.test.tsx
describe('VariantEditor', () => {
  it('should edit and save variant', async () => {
    render(<VariantEditor modelId={modelId} />);
    
    userEvent.click(screen.getByRole('button', { name: /edit/i }));
    userEvent.clear(screen.getByDisplayValue('8GB'));
    userEvent.type(screen.getByDisplayValue(''), '12GB');
    userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Variant updated')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
// master-data.cy.ts
describe('Master Data - Add/Edit Flow', () => {
  it('should create brand with logo and model with variants', () => {
    cy.visit('/suadmin/master-data');
    
    // Add brand
    cy.contains('Add Brand').click();
    cy.get('input[placeholder*="Apple"]').type('OnePlus');
    cy.get('input[type="file"]').selectFile('logo.png');
    cy.contains('Create Brand').click();
    cy.contains('Brand created').should('be.visible');
    
    // Add series
    cy.get('input[placeholder*="Series"]').select('OnePlus');
    cy.contains('Add Series').click();
    cy.get('input[placeholder*="Series"]').type('12 Series');
    cy.contains('Create Series').click();
    
    // Add model
    cy.contains('Add Model').click();
    cy.get('input[placeholder*="iPhone"]').type('OnePlus 12');
    cy.contains('Create Model').click();
    
    // Add variants
    cy.contains('Manage Variants').click();
    cy.get('input[placeholder*="8GB"]').type('12GB');
    cy.get('input[placeholder*="256GB"]').type('512GB');
    cy.contains('Add').click();
    
    cy.contains('Variant added').should('be.visible');
  });
});
```

---

## 📚 File Structure After Implementation

```
src/
├── pages/admin/
│   └── MobileMasterManager.tsx (Enhanced with all Phase 1 features)
├── services/
│   ├── mobileMasterService.ts (Added updateVariant, bulk methods)
│   └── masterDataImportExport.ts (NEW)
├── lib/
│   ├── imageUpload.ts (NEW)
│   └── masterDataValidation.ts (NEW)
└── components/
    └── (No changes needed)
```

---

## 🚀 Deployment Strategy

1. **Phase 1** (Week 1)
   - Deploy to staging first
   - Test all CRUD operations
   - Get team feedback
   - Deploy to production

2. **Phase 2** (Week 2)
   - Staging deployment
   - Migration testing
   - Gradual rollout

3. **Phase 3** (Week 3)
   - Optional features
   - No rush, gather usage data first

---

## 📞 Support & Questions

For implementation questions, refer to:
- [docs/MASTER_DATA_SYSTEM.md](./MASTER_DATA_SYSTEM.md) — Full system documentation
- [docs/AI_BUILD_GUIDE.md](./AI_BUILD_GUIDE.md) — Development patterns
- `src/services/mobileMasterService.ts` — Service examples

