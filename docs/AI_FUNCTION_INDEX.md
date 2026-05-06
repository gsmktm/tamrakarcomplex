# AI Function Index

This index lists the important exported functions, hooks, services, utilities, and edge functions. UI components are not exhaustively listed unless they define data or routing behavior.

## Providers And Context

- `AuthProvider`, `useAuth` in `src/hooks/useAuth.tsx`
  - Owns Supabase session, auth user, resolved app role, sign in, sign up, sign out, OAuth sign in, and role refresh.
- `ThemeProvider`, `useTheme` in `src/hooks/useTheme.tsx`
  - Owns theme state.
- `CartProvider`, `useCart` in `src/contexts/CartContext.tsx`
  - Owns cart item state and cart operations.
- `ProfileProvider`, `useProfile` in `src/components/profile/ProfileContext.tsx`
  - Owns profile context for profile panels.

## Route Guards And Redirects

- `RequireAuth` - auth-required wrapper with optional role allow list.
- `RequireStaffAdmin` - staff admin guard with optional `module` and `action`.
- `RequireStoreAdmin` - store admin guard.
- `RequireSuperAdmin` - super admin guard.
- `RequireAdmin` - legacy admin guard.
- `ParamRouteRedirect` - preserves route params while redirecting.
- `ProfileRedirect` and `DashboardRedirect` - redirect user to role-appropriate area.
- `getDashboardPathForRole`, `getProfilePathForRole`, `getSafeLocalRedirectPath`, `getPostLoginRedirectPath` in `src/lib/authRedirects.ts`.

## Services

- `storeDirectoryService` in `src/services/storeDirectoryService.ts`
  - Store directory queries, store detail lookup, store products/listings, store updates.
- `submissionService` in `src/services/submissionService.ts`
  - `submitContactMessage`, `submitStoreApplication`, `submitRepairRequest`, `submitLeadQuote`.
- `priceListService` in `src/services/priceListService.ts`
  - Catalog product listing/update/bulk update/import, duplicate detection/merge, brand fetch, sync to products.
- `brandService` in `src/services/brandService.ts`
  - Brand list, get, create, update, delete.
- `deviceVerificationService` in `src/services/deviceVerificationService.ts`
  - Catalog product verification, duplicate checks, verification stats.
- `repairService` in `src/services/repairService.ts`
  - `repairStatusLabel`, `createRepairRequest`, `getEligibleRepairStores`.
- `sellPhoneService` in `src/services/sellPhoneService.ts`
  - Device search, valuation calculation, valuation lead creation, best-effort `leads_quotes` mirroring, search event tracking, target store lookup.
  - Important: `saveLead` is intentionally tolerant of mixed `sell_phone_leads` schemas because older migrations created legacy `name/phone/device_brand/asking_price` columns while newer flows use `customer_*`, `brand/model`, `quoted_value`, assignment, and defects.
- `packageEnforcement` in `src/services/packageEnforcement.ts`
  - `getPackageRules`, `canAddProduct`, `canAddAdmin`, and static package limits.
- `gsmArenaService` and `evostoreService`
  - Product import/scrape helpers and image upload helpers.

## Hooks By Feature

Authentication/profile/settings:

- `useCurrentUserRole`
- `usePermissions`
- `useAllowedMenuItems`
- `useProfile`, `getCurrentProfile`, `updateProfile`, `uploadAvatar`, `saveProfileChanges`
- `useSystemSettings`, `getSystemSettings`, `getSetting`, `updateSetting`, `updateMultipleSettings`, `resetSetting`
- `usePanelScope`
- `useVisitorTracking`

Public content/catalog:

- `useProducts`, `useFeaturedProducts`, `useProduct`, `useProductsByCategory`, `useProductsQuery`, `useProductsByCategoryQuery`, `useBrandsByCategory`
- `useProductSearch`
- `useArticlesList`, `useArticles`, `useFeaturedArticles`, `useArticle`, `useArticlesByCategory`
- `useGuidesList`, `useGuide`, `useGuideCategories`
- `useBrands`
- `usePriceList`, `usePublicPriceList`, `usePriceListBrands`, `useUpdatePriceListProduct`, `useBulkUpdatePriceList`, `useImportPriceListCSV`, `usePriceListDuplicates`, `useMergePriceListDuplicates`

Marketplace/store:

- `useMarketplaceListings`, `useFeaturedListings`, `useListingDetail`, `useStoreListings`, `useCreateListing`, `useUpdateListing`, `useDeleteListing`, `useFeatureListing`, `useListingInquiries`, `useCreateInquiry`, `useUpdateInquiry`, `useStoreMarketplaceStats` in `src/hooks/useMarketplace.ts`
- `useMarketplaceListings` in `src/hooks/useMarketplaceListings.ts` is a simpler record query.
- `useMarketplacePreview`
- `useWishlist`
- `useStoresDirectory`
- `useStoreDirectory`, `useStoreDetail`, `useStoreProducts`, `useStoreListings`, `useUpdateStore`
- `useStoresWithEntitlements`, `useFeaturedStores`, `useStoresByZone`, `useSearchStores`, `useStoreDetail`
- `useStorePreview`
- `useMyStores`
- `useStorePackages`, `useStoreSubscriptions`, `useSubscriptionLimits`

Admin/team/task:

- `useStaffAdmins`
- `useStoreAdmins`
- `useStaffPermissions`
- `useStorePermissions`
- `useStaffTasks`
- `useStoreTasks`
- `useStoreStaff`
- `useStaffPerformance`
- `useAuditLogs`

Repair/unlocking:

- `useRepairSubmit`
- `useRepairRequests`
- `useUnlockingRequests`
- `useUnlockCatalog`, `useUnlockRequests`, `createUnlockRequest`, `updateUnlockRequestStatus`
- `useRepairCategories`, `useRepairCategory`, `useRepairDevices`, `useRepairDevice`, `useRepairGuides`, `useRepairGuide`

Homepage/system:

- `useHomeOffers`
- `useHomepageSettings`
- `useDebounce`
- `useIsMobile`
- `useToast`

## Lib Utilities

- `src/lib/security.ts`
  - `sanitizeText`, `sanitizeOptionalText`, `normalizeEmail`, `normalizePhone`, `isValidEmail`, `isValidNepalPhone`, `isValidImei`.
- `src/lib/roles.ts`
  - `normalizeRole`, `getRoleFromEmail`, `isAdminRole`, `isSuperAdminRole`, `isStoreAdminRole`, `isStoreOwnerRole`, `mapLegacyRole`, `getRoleLabel`, `getRoleBadgeVariant`.
- `src/lib/permissions.ts`
  - Staff permission constants, `getStaffPermissions`, `canAccessModule`, `canSeeMenuItem`, `getFilteredMenu`.
- `src/lib/auditLog.ts`
  - Audit logging helper.
- `src/lib/edgeFunctions.ts`
  - `checkEdgeFunctionAvailability`, `assertEdgeFunctionAvailable`.
- `src/lib/valuation.ts`
  - `slugifyDeviceKey`, `normalizeStorage`.
- `src/lib/seo.ts`
  - SEO metadata helpers.
- `src/lib/siteSettings.ts`
  - Site settings helpers.
- `src/lib/storePackages.ts`, `src/lib/storeTier.ts`, `src/lib/storeEntitlements.ts`
  - Store tier/package/entitlement helpers.
- `src/lib/storeThemeBuilder.ts`
  - Store theme builder helpers.
- `src/lib/listingMeta.ts`
  - Marketplace listing display metadata helpers.
- `src/lib/utils.ts`
  - Shared `cn`/utility helpers.

## Supabase Edge Functions

- `bootstrap-admin`
  - Bootstraps admin role data.
- `create-order-secure`
  - Creates order and order item records with server-side validation.
- `create-payment-session`
  - Creates payment session/payment records.
- `verify-payment`
  - Verifies payment and updates order/payment state.
- `newsletter-subscribe`
  - Handles newsletter signup and rate limiting.
- `valuation-estimator`
  - Computes valuation estimates from device catalog/rules.
- `import-gadgetbyte-products`
  - Imports products after role/permission checks.
- `import-gadgetbyte-articles`
  - Imports articles after role/permission checks.
- `sitemap`
  - Calls `generate_seo_sitemap`.
- `_shared/cors.ts`
  - `getCorsHeaders`, `assertAllowedOrigin`, `requireUser`.

## Route-Level Pages To Check For Logic

Large manager pages contain important inline functions:

- `src/pages/admin/ProductManager.tsx`
- `src/pages/sell/SellYourPhone.tsx`
  - Multi-step sell-phone valuation flow. Accepts product-page query params like `?brand=Apple&model=iPhone%2015` and preselects matching catalog rows when available.
- `src/pages/ProductDetail.tsx`
  - Product detail includes internal SEO/UX link into `/sell-your-phone` with brand/model query params.
- `src/pages/admin/StoreManager.tsx`
- `src/pages/admin/ArticleManager.tsx`
- `src/pages/admin/UserManager.tsx`
- `src/pages/admin/ListingManager.tsx`
- `src/pages/admin/PollManager.tsx`
- `src/components/admin/repair/RepairCatalogManager.tsx`

When modifying those areas, inspect the page directly in addition to this index.
