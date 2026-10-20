# Tamrakar Complex — Premium Homepage 2026

## Scope

This branch implements the approved navy/orange electronics marketplace direction in the **existing React + Vite application**. It is an implementation, not just an image or static HTML export.

### Files

- `src/components/sections/PremiumHomepage2026.tsx` — accessible, responsive hero; marketplace search; six category paths; eight brand filters; live catalog; active store profiles; exchange, repair and device discovery CTAs; three-step journey and trust section.
- `src/styles/homepage-2026.css` — scoped visual tokens and component styles for 1440px desktop, tablet, and mobile, plus reduced-motion preferences.
- `src/components/sections/EcommerceHomeSection.tsx` — mounts the new homepage before existing flagship, price finder, store services, editorial, offers and inquiry components. Existing routes remain intact.
- `src/components/layout/Header.tsx` and `NavigationBar.tsx` — align navigation accents to midnight navy and orange.
- `src/pages/Index.tsx` — homepage SEO and wrapper adjustments.

## Data integrity

- Products are queried from the existing Supabase `products` table: **no invented prices, inventory, store names or ratings**.
- Store previews use the project's existing `useStorePreview` hook and `getPublicStorePath` route helper.
- Existing `ProductCard` provides working product navigation, cart and comparison interactions.
- Empty/error states are visible when products or stores cannot be loaded.
- Shop routes are linked rather than attempting checkout directly from marketing CTAs.

## User flows to check in preview

1. Search for a phone or laptop (search routes to `/buy?q=...`).
2. Open each category and brand link, including tablets and accessories.
3. Inspect product details, wishlist, compare and cart actions on a real listing.
4. Visit a published store using its correct slug.
5. Follow exchange, repair and service CTAs.
6. View keyboard focus order, contrast, touch targets and mobile bottom navigation.
7. Confirm newsletter subscription and existing backend flows still work.
8. Check SEO metadata and responsive views at 375px, 768px, 1024px and 1440px.

## Test commands

```bash
npm ci
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm test
npm run check-routes
npm run build
```

CI runs on PRs to `main`. cPanel deployment is configured only for pushes to `main`, so this design branch should not deploy.

## Limitations and release gate

- The original inspiration is a generated design image in the conversation. The implementation uses existing product imagery and CSS graphics, rather than embedding the rendered mockup as a rasterized site.
- The live deployment, prices, imagery and real-device interactions must be inspected in a connected preview.
- Existing homepage sections are deliberately retained underneath the new showcase to avoid deleting forms and functionality. Review section ordering and any unnecessary duplication before merge.
- No production schema, payments, credentials, or deployment settings are changed by this branch.
