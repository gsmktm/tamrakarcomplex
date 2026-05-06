# Store Directory + Package Control Module Documentation

## Overview

Complete store management system with package-based feature entitlements and role-based access controls.

## Architecture

### Core Components

#### 1. **Entitlements System** (`src/lib/storeEntitlements.ts`)
Central hub defining all package features and permissions.

**Key Functions:**
- `getStoreEntitlements(packageSlug)` - Returns complete feature set for a package
- `hasFeature(packageSlug, feature)` - Check if feature is enabled
- `shouldShowFeatureInAdmin(packageSlug, feature)` - Determine UI visibility
- `getContactFieldVisibility(packageSlug, field, isAuthenticated)` - Calculate contact visibility

**Package Tiers:**
- **Free**: Basic listing only, no contact info, no products
- **Silver**: Full profile, contact after login, 200 products, basic services
- **Gold**: Public contact, verified badge, featured placement, 2000 products
- **Diamond**: Unlimited products, top placement, custom design, priority leads

#### 2. **Database Schema** (`supabase/migrations/20260425_store_package_control.sql`)

**New Fields Added to `stores` table:**
```sql
- package_slug (free|silver|gold|diamond)
- slug (URL-friendly identifier)
- complex_zone (inside|outside)
- floor (location identifier)
- address (detailed address)
- whatsapp (contact number)
- cover_image_url (store banner)
- services_json (JSON array of services)
- social_links_json (JSON object of links)
```

#### 3. **RLS Policies** (`supabase/migrations/20260425_store_entitlements_rls.sql`)

**Feature-Gating Enforcement:**
- Product listings limited by package
- Service listings limited by package
- Marketplace access controlled by package
- Staff member limits enforced
- Branch limits enforced

**Policy Functions:**
- `store_can_list_products(package_slug)` - Check product listing eligibility
- `get_product_limit_by_package(package_slug)` - Get product limit
- `can_show_contact_public(package_slug)` - Check public contact visibility
- `store_can_manage_branches(package_slug)` - Check multi-branch support

### Hooks

#### `useStoresWithEntitlements()` (`src/hooks/useStoresEntitlements.ts`)
Fetches stores with entitlements applied, automatically:
- Filters based on authentication status
- Applies contact field visibility rules
- Respects package feature limits
- Sorts by tier priority

**Usage:**
```typescript
const { data: stores } = useStoresWithEntitlements();
```

#### `useFeaturedStores()`
Gets featured stores sorted by package priority (Diamond → Gold → Silver → Free)

#### `useStoreDetail(storeId)`
Fetches single store with all entitlements applied

### Pages & Components

#### Store Admin Pages

**1. Profile Management** (`src/pages/admin/storeadmin/StoreProfile.tsx`)
- Edit basic store information
- Manage contact details (locked based on package)
- Upload media (logo, cover image)
- Configure advanced settings
- UI features hidden for lower packages with visual lock indicators

**2. Subscription Management** (`src/pages/admin/storeadmin/StoreSubscription.tsx`)
- View current package and pricing
- Track usage (products, admins, branches)
- View available features
- See upgrade options with detailed comparisons
- Renew subscription

**3. Settings** (to be created)
- Marketplace configuration
- Theme selection
- Payout settings
- Team & staff management

#### Admin Pages

**1. Super Admin - Store Management** (`src/pages/admin/supadmin/StoresManagement.tsx`)
- View all stores with stats
- Filter by package and subscription status
- Edit any store's package
- Override packages manually
- Suspend/maintain stores
- Bulk actions (coming soon)

**2. Staff Admin - Store Management** (`src/pages/admin/staffadmin/StoresManagement.tsx`)
- View only assigned stores
- Edit store details (not package or subscription)
- Limited to stores with "manage" or "update" permission
- Update contact info, description, social links

#### Public Pages

**1. Stores Directory** (`src/pages/Stores.tsx`)
- Filter by package tier
- Search stores
- Package-appropriate visibility
- Contact info hidden/visible based on auth and package

**2. Store Detail** (`src/pages/StoreDetail.tsx`)
- Full store information respecting package
- Contact fields shown/hidden appropriately
- Marketplace link (if enabled)
- Services listing (if allowed by package)

## Feature Entitlements

### Contact Information
| Feature | Free | Silver | Gold | Diamond |
|---------|------|--------|------|---------|
| Phone Public | ❌ | After Login | ✅ | ✅ |
| WhatsApp Public | ❌ | After Login | ✅ | ✅ |
| Email Public | ❌ | After Login | ✅ | ✅ |

### Products & Services
| Feature | Free | Silver | Gold | Diamond |
|---------|------|--------|------|---------|
| Product Listing | ❌ | 200 | 2,000 | ∞ |
| Service Listing | ❌ | 5 | 20 | 1,000 |
| Marketplace | ❌ | ✅ | ✅ | ✅ |
| Commission | - | 10% | 7% | 5% |

### Placement & Visibility
| Feature | Free | Silver | Gold | Diamond |
|---------|------|--------|------|---------|
| Featured | ❌ | ❌ | ✅ | ✅ |
| Verified Badge | ❌ | Request | ✅ | ✅ |
| Featured Priority | - | - | 2 | 1 |

### Admin & Team
| Feature | Free | Silver | Gold | Diamond |
|---------|------|--------|------|---------|
| Admin Users | 1 | 2 | 5 | 20 |
| Staff Members | 0 | 0 | 3 | 50 |
| Branches | 1 | 1 | 3 | 10 |

### Advanced Features
| Feature | Free | Silver | Gold | Diamond |
|---------|------|--------|------|---------|
| Analytics | ❌ | ✅ | ✅ | ✅ |
| Lead Management | ❌ | ✅ | ✅ | ✅ |
| Theme Customization | ❌ | ❌ | ✅ | ✅ |
| Custom Pages | ❌ | ❌ | ✅ | ✅ |
| Homepage Banner | ❌ | ❌ | 1 | 5 |

## Permission System

### Store Permissions Table
```sql
store_permissions (
  user_id → auth.users
  store_id → stores
  permission: 'view' | 'update' | 'manage'
  created_at
)
```

### Role-Based Access

**Store Admin (storeadmin)**
- Can only manage own store
- Full control over profile, products, services
- Can't change package or subscription
- Can manage staff (if allowed by package)

**Staff Admin (staffadmin)**
- Can manage assigned stores only
- Limited to store details (contact, description)
- Can't change package or subscription
- Requires explicit permission grant

**Super Admin (supadmin)**
- Can manage all stores
- Can override packages
- Can change subscription status
- Can suspend/maintain stores

## Implementation Checklist

### Database
- [x] Add new store fields
- [x] Create RLS policies for feature gating
- [x] Add helper functions for entitlements
- [x] Create store_permissions table (expected)
- [x] Update subscription tracking

### Types
- [x] Create comprehensive Store types
- [x] Add StoreUpdateInput for partial updates
- [x] Add PackageOverride type
- [x] Add featured store types

### Core Library
- [x] Create `storeEntitlements.ts` with all rules
- [x] Create `useStoresEntitlements.ts` hook
- [x] Update `storePackages.ts` metadata

### Pages
- [x] Create Store Admin Profile page
- [x] Create Store Admin Subscription page
- [x] Create Super Admin Management page
- [x] Create Staff Admin Management page
- [ ] Update Stores Directory with new features
- [ ] Update Store Detail page with entitlements
- [ ] Create Store Settings page

### UI Components (to create)
- [ ] Package info card
- [ ] Feature lock indicators
- [ ] Upgrade prompts
- [ ] Usage progress bars
- [ ] Store comparison component

## Usage Examples

### Check if Feature is Enabled
```typescript
import { getStoreEntitlements } from "@/lib/storeEntitlements";

const entitlements = getStoreEntitlements("gold");
if (entitlements.canListProducts) {
  // Show product listing UI
}
```

### Get Contact Field Visibility
```typescript
import { getContactFieldVisibility } from "@/lib/storeEntitlements";

const visibility = getContactFieldVisibility("silver", "phone", isAuthenticated);
if (visibility === "public") {
  // Show phone publicly
} else if (visibility === "login-required") {
  // Show login prompt to see phone
} else {
  // Hide phone completely
}
```

### Sort Featured Stores by Priority
```typescript
import { sortFeaturedStoresByPriority } from "@/lib/storeEntitlements";

const sortedIds = sortFeaturedStoresByPriority(stores);
// Returns store IDs sorted: Diamond → Gold → Silver → Free
```

### Disable Feature in Admin UI
```typescript
import { shouldShowFeatureInAdmin } from "@/lib/storeEntitlements";

if (!shouldShowFeatureInAdmin(store.package_slug, "themes")) {
  // Show lock icon and upgrade message
}
```

## Security Considerations

1. **Database-Level Enforcement**: RLS policies enforce limits at the database level
2. **Package Immutability**: Only super admins can change packages (should be via subscription flow)
3. **Permission Delegation**: Staff admins need explicit permission grants
4. **Audit Logging**: Policy violations are logged to `policy_violation_logs` table
5. **Contact Data**: Contact info visibility is controlled both at query level and application level

## Future Enhancements

1. **Subscription Automation**
   - Automatic package downgrade on subscription expiry
   - Auto-renewal configuration
   - Invoice generation

2. **Lead Management**
   - Priority lead routing
   - Lead distribution based on package
   - Lead analytics

3. **Multi-language Support**
   - Entitlements descriptions
   - Admin UI localization

4. **Advanced Analytics**
   - Store performance dashboards
   - Lead conversion tracking
   - Feature usage analytics

5. **Marketplace Integration**
   - Dynamic commission based on performance
   - Cross-store inventory
   - Unified checkout

## Database Relationships

```
users (1) ─── (N) stores (store owner)
              │
              ├─ (N) products
              ├─ (N) repair_services
              ├─ (N) store_pages
              ├─ (N) store_staff
              ├─ (N) store_branches
              └─ (1) subscriptions

users (N) ─── (N) store_permissions ─── (N) stores
```

## API Endpoints (to be implemented)

```
GET    /api/stores                          # List all public stores
GET    /api/stores/:storeId                # Get store details
GET    /api/stores/:storeId/entitlements   # Get store features
GET    /api/stores/featured                # Get featured stores
GET    /api/admin/stores                   # Admin: all stores
PUT    /api/admin/stores/:storeId          # Admin: update store
PUT    /api/admin/stores/:storeId/package  # Admin: override package
POST   /api/stores/:storeId/upgrade        # Store: initiate upgrade
```

## Testing Scenarios

1. **Free to Silver Upgrade**
   - Verify contact fields become visible after login
   - Verify product listing limit increases
   - Verify UI shows new features

2. **Package Downgrade**
   - Verify excess products are archived
   - Verify contact info becomes hidden
   - Verify staff members are removed

3. **Subscription Expiry**
   - Verify store becomes private
   - Verify directory listing removed
   - Verify analytics access revoked

4. **Permission Management**
   - Staff admin can't change package
   - Staff admin can update allowed fields
   - Super admin can override any field

## Related Files

- Store types: `src/types/store.ts`
- Hooks: `src/hooks/useStoresEntitlements.ts`
- Pages: `src/pages/admin/*/`
- Migrations: `supabase/migrations/20260425*`
- Utilities: `src/lib/storeEntitlements.ts`
