# Master Data System — Quick Implementation Guide

**Date:** May 13, 2026  
**For:** Frontend Developers  
**Goal:** Step-by-step guide to implement Phase 1 enhancements

---

## 🎯 Phase 1 Implementation Goals

**Timeline:** 1 Week  
**Deliverables:**
- ✅ Edit Variant functionality
- ✅ Image upload (logos, model images)
- ✅ Input validation with error messages
- ✅ Improved error handling

**Expected Impact:** 80% more powerful master-data management

---

## 📖 Before You Start

1. Read complete documentation:
   - [docs/MASTER_DATA_SYSTEM.md](./MASTER_DATA_SYSTEM.md) — Understand the system
   - [docs/MASTER_DATA_ENHANCEMENTS.md](./MASTER_DATA_ENHANCEMENTS.md) — Understand enhancements
   - [docs/AI_BUILD_GUIDE.md](./AI_BUILD_GUIDE.md) — Development patterns

2. Check local setup:
   ```bash
   npm install
   npm run dev
   # Verify http://localhost:8080 loads
   ```

3. Understand current code:
   ```bash
   cd src/
   # Read these files:
   # - pages/admin/MobileMasterManager.tsx (Main UI)
   # - services/mobileMasterService.ts (Backend calls)
   ```

---

## 💻 Task 1: Add `updateVariant` Function (30 min)

### File: `src/services/mobileMasterService.ts`

**Location:** After `deleteVariant` function (around line 95)

**Add this function:**

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
},
```

**Test it:**
```bash
# In browser console at /suadmin/master-data
const variant = await mobileMasterService.updateVariant(
  'variant-id',
  { ram: '12GB' }
);
console.log(variant);  // Should show updated variant
```

---

## 💻 Task 2: Update VariantEditor Component (1 hour)

### File: `src/pages/admin/MobileMasterManager.tsx`

**Location:** Around line 770 (VariantEditor function)

**Step 1:** Add state for editing mode

Replace this section:
```typescript
function VariantEditor({ modelId }: { modelId: string }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    ram: "",
    storage: "",
    color: "",
    condition_type: "new",
  });
```

With:
```typescript
function VariantEditor({ modelId }: { modelId: string }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ram: "",
    storage: "",
    color: "",
    condition_type: "new",
  });
  const [editFormData, setEditFormData] = useState<any>(null);
```

**Step 2:** Add update mutation

After `deleteMutation`, add:
```typescript
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) =>
      mobileMasterService.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model_variants", modelId] });
      toast.success("Variant updated");
      setEditingId(null);
      setEditFormData(null);
    },
    onError: (error: any) => toast.error("Failed to update: " + error.message)
  });
```

**Step 3:** Update table rendering

Find this section in the TableBody:
```typescript
{variants?.map((v: any) => (
  <TableRow key={v.id}>
    <TableCell className="py-2 text-sm font-medium">{v.ram || '-'}</TableCell>
    <TableCell className="py-2 text-sm">{v.storage || '-'}</TableCell>
    <TableCell className="py-2 text-sm">{v.color || '-'}</TableCell>
    <TableCell className="py-2 text-right">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
        if (confirm("Delete variant?")) {
          deleteMutation.mutate(v.id);
        }
      }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </TableCell>
  </TableRow>
))}
```

Replace with:
```typescript
{variants?.map((v: any) => (
  <TableRow key={v.id}>
    {editingId === v.id ? (
      <>
        <TableCell className="py-2">
          <Input 
            value={editFormData.ram} 
            onChange={e => setEditFormData({...editFormData, ram: e.target.value})}
            placeholder="RAM"
            className="h-8 text-sm"
          />
        </TableCell>
        <TableCell className="py-2">
          <Input 
            value={editFormData.storage} 
            onChange={e => setEditFormData({...editFormData, storage: e.target.value})}
            placeholder="Storage"
            className="h-8 text-sm"
          />
        </TableCell>
        <TableCell className="py-2">
          <Input 
            value={editFormData.color} 
            onChange={e => setEditFormData({...editFormData, color: e.target.value})}
            placeholder="Color"
            className="h-8 text-sm"
          />
        </TableCell>
        <TableCell className="py-2 text-right flex gap-1 justify-end">
          <Button 
            size="icon" 
            className="h-7 w-7"
            onClick={() => updateMutation.mutate({ id: v.id, data: editFormData })}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          </Button>
          <Button 
            variant="ghost"
            size="icon" 
            className="h-7 w-7"
            onClick={() => {
              setEditingId(null);
              setEditFormData(null);
            }}
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
            if (confirm("Delete variant?")) {
              deleteMutation.mutate(v.id);
            }
          }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </>
    )}
  </TableRow>
))}
```

**Step 4:** Add import for X icon

At the top of the file, find lucide-react imports and add:
```typescript
import {
  // ... existing imports ...
  X,      // ADD THIS
} from "lucide-react";
```

**Test it:**
1. Open `/suadmin/master-data`
2. Select a model
3. Go to "Connections" tab
4. Click "Manage Variants"
5. Click pencil icon on a variant
6. Edit RAM/Storage/Color
7. Click checkmark to save
8. Should show "Variant updated" toast

---

## 💻 Task 3: Create Validation Schema (45 min)

### File: `src/lib/masterDataValidation.ts` (NEW)

**Create new file with:**

```typescript
import { z } from 'zod';

// Regex patterns
const slugPattern = /^[a-z0-9-]+$/;
const yearRange = new Date().getFullYear();

// Brand Validation
export const BrandSchema = z.object({
  name: z.string()
    .min(1, 'Brand name is required')
    .max(100, 'Brand name must be less than 100 characters'),
  slug: z.string()
    .toLowerCase()
    .regex(slugPattern, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  logo: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

export type BrandInput = z.infer<typeof BrandSchema>;

// Series Validation
export const SeriesSchema = z.object({
  brand_id: z.string().uuid('Invalid brand'),
  name: z.string()
    .min(1, 'Series name is required')
    .max(100, 'Series name must be less than 100 characters'),
  slug: z.string()
    .toLowerCase()
    .regex(slugPattern, 'Invalid slug format'),
});

export type SeriesInput = z.infer<typeof SeriesSchema>;

// Model Validation
export const ModelSchema = z.object({
  brand_id: z.string().uuid('Invalid brand'),
  series_id: z.string().uuid('Invalid series').optional().or(z.literal('')),
  name: z.string()
    .min(1, 'Model name is required')
    .max(100, 'Model name must be less than 100 characters'),
  slug: z.string()
    .toLowerCase()
    .regex(slugPattern, 'Invalid slug format'),
  model_number: z.string()
    .max(50, 'Model number too long')
    .optional()
    .or(z.literal('')),
  release_year: z.number()
    .int('Release year must be an integer')
    .min(2000, 'Release year must be 2000 or later')
    .max(yearRange + 1, `Release year cannot be more than ${yearRange + 1}`),
});

export type ModelInput = z.infer<typeof ModelSchema>;

// Variant Validation
export const VariantSchema = z.object({
  model_id: z.string().uuid('Invalid model'),
  ram: z.string()
    .max(50, 'RAM specification too long')
    .optional()
    .or(z.literal('')),
  storage: z.string()
    .max(50, 'Storage specification too long')
    .optional()
    .or(z.literal('')),
  color: z.string()
    .max(100, 'Color name too long')
    .optional()
    .or(z.literal('')),
  region: z.string()
    .max(50, 'Region name too long')
    .optional()
    .or(z.literal('')),
  condition_type: z.enum(['new', 'refurbished', 'used']).default('new'),
  status: z.enum(['active', 'archived']).default('active'),
});

export type VariantInput = z.infer<typeof VariantSchema>;

// Specs Validation
export const SpecSchema = z.object({
  model_id: z.string().uuid('Invalid model'),
  display: z.string()
    .max(200, 'Too long')
    .optional()
    .or(z.literal('')),
  processor: z.string()
    .max(200, 'Too long')
    .optional()
    .or(z.literal('')),
  camera: z.string()
    .max(200, 'Too long')
    .optional()
    .or(z.literal('')),
  battery: z.string()
    .max(100, 'Too long')
    .optional()
    .or(z.literal('')),
  charging: z.string()
    .max(100, 'Too long')
    .optional()
    .or(z.literal('')),
  os: z.string()
    .max(100, 'Too long')
    .optional()
    .or(z.literal('')),
  pros: z.array(z.string()).optional().default([]),
  cons: z.array(z.string()).optional().default([]),
  verdict: z.string()
    .max(2000, 'Verdict too long')
    .optional()
    .or(z.literal('')),
});

export type SpecInput = z.infer<typeof SpecSchema>;

// Validation helper
export function validateAndReport(schema: z.ZodSchema, data: any): { valid: boolean; error?: string; data?: any } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error: any) {
    const errorMessage = error.errors?.[0]?.message || 'Validation failed';
    return { valid: false, error: errorMessage };
  }
}
```

---

## 💻 Task 4: Add Validation to AddBrandDialog (30 min)

### File: `src/pages/admin/MobileMasterManager.tsx`

**Location:** AddBrandDialog component (around line 420)

**Import validation at top of file:**
```typescript
import { BrandSchema, validateAndReport } from '@/lib/masterDataValidation';
```

**Update AddBrandDialog:**

```typescript
function AddBrandDialog({ onAdd }: { onAdd: (data: any) => void }) {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    setErrors({});
    
    const slug = slugify(name);
    const { valid, error, data } = validateAndReport(BrandSchema, { name, slug });
    
    if (!valid) {
      setErrors({ name: error || 'Invalid input' });
      return;
    }
    
    onAdd(data);
    setOpen(false);
    setName("");
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
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Apple, Samsung"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate}>Create Brand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Follow same pattern for:**
- AddSeriesDialog
- AddModelDialog
- EditBrandDialog
- EditModelDialog

---

## 🧪 Testing Checklist

After each task, verify:

### Task 1: updateVariant Function
- [ ] Function exists in service
- [ ] Takes correct parameters (id, partial object)
- [ ] Returns updated variant
- [ ] Throws error on invalid ID

### Task 2: VariantEditor Component
- [ ] Pencil icon appears on hover
- [ ] Clicking pencil shows editable cells
- [ ] Can edit RAM/Storage/Color
- [ ] Checkmark saves changes
- [ ] X button cancels editing
- [ ] Toast shows "Variant updated"
- [ ] List updates with new values
- [ ] Delete still works

### Task 3: Validation Schema
- [ ] File creates without errors
- [ ] Exports all schemas correctly
- [ ] `validateAndReport` function works
- [ ] Returns both valid and error states

### Task 4: Validation in Dialogs
- [ ] Empty name shows error
- [ ] Very long name shows error
- [ ] Invalid characters in name show error
- [ ] Valid name allows create
- [ ] Error message displays clearly
- [ ] Error clears on next input

---

## 🐛 Common Issues & Solutions

### Issue: "updateVariant is not a function"
**Solution:** Make sure you added the function to the `mobileMasterService` object correctly. Check that it's inside the `export const mobileMasterService = { ... }` block.

### Issue: Edit button not appearing
**Solution:** Make sure you imported the `Pencil` icon from lucide-react at the top of the file.

### Issue: Validation always fails
**Solution:** Check that zod is installed: `npm list zod`. If not, install: `npm install zod`

### Issue: Changes not reflecting in UI
**Solution:** Make sure `queryClient.invalidateQueries` is called in the mutation `onSuccess` handler.

---

## 📊 Progress Tracking

Create a checklist file `.trae/master-data-phase1.md`:

```markdown
# Phase 1 Implementation Progress

## Tasks
- [ ] Task 1: Add updateVariant function (30 min)
- [ ] Task 2: Update VariantEditor component (1 hour)
- [ ] Task 3: Create validation schema (45 min)
- [ ] Task 4: Add validation to dialogs (30 min)

## Testing
- [ ] Local testing complete
- [ ] All edit flows tested
- [ ] All validation tested
- [ ] Error handling tested

## Deployment
- [ ] Code review completed
- [ ] Staged deployment
- [ ] Production deployment
- [ ] User testing

## Date Started: _____
## Target Completion: _____
## Actual Completion: _____
```

---

## 📞 Help & Questions

If you get stuck:

1. **Check the code:** Look at existing dialogs (AddBrandDialog, EditModelDialog)
2. **Test in console:** Use `mobileMasterService.updateVariant()` directly
3. **Check network:** Open DevTools → Network tab to see Supabase errors
4. **Read docs:** [docs/MASTER_DATA_SYSTEM.md](./MASTER_DATA_SYSTEM.md) has all details

---

## 🚀 What's Next?

After Phase 1 is complete:
- **Phase 2 (Week 2):** Bulk import/export, duplicate detection
- **Phase 3 (Week 3):** Rich text editor, color picker, advanced filters

See [docs/MASTER_DATA_ENHANCEMENTS.md](./MASTER_DATA_ENHANCEMENTS.md) for full roadmap.

---

**Happy Coding! 🎉**
