---
name: storefront-ui-qa
description: Review mobile-first storefronts, search, product cards, onboarding, forms and accessible UI behavior. Use when altering visuals or customer workflows.
---

# Storefront UI/UX Quality

Adapted from Addy Osmani's frontend/accessibility practices and nextlevelbuilder/ui-ux-pro-max-skill principles, not a wholesale vendor install.

1. Review the user task: find product → compare → see trusted price/availability → select store → checkout/repair/trade-in.
2. Inspect at 360px mobile, 768px tablet and 1280px desktop when a browser is available. Confirm no horizontal overflow, inaccessible menus or clipped prices.
3. Provide meaningful labels, visible focus, keyboard interaction, readable contrast and loading/error/empty states.
4. Price badges must communicate whether they are official, current store offer, last-listed or an estimate. Do not hide stock uncertainty with attractive styling.
5. Keep existing shadcn/Tailwind design tokens; avoid duplicate component libraries and large unreviewed generated icon sets.
6. Run relevant component tests and `npm run chrome:check` with a real browser. Mark browser verification NOT RUN if unavailable.
