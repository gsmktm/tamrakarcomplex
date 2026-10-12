# Tamrakar Complex — V3 Pro Color & Typography System

**Project:** Tamrakar Complex, New Road, Kathmandu  
**Scope:** color, typography, surfaces, interaction states and visual consistency across storefront and four dashboards  
**Source:** `TAMRAKAR COMPLEX — MASTER DEVELOPMENT PROMPT V3.0`, section 3 (brand direction/color/typography), section 19 (reusable design system), section 20 (mobile accessibility).  
**Status:** Implemented as default theme on the existing V3 GitHub feature branch. Production deployment and full visual review are not claimed.

## Visual principles

- **Trust:** deep navy anchors global identity, navigation and information architecture.
- **Luxury without clutter:** antique gold is for carefully chosen typography, borders and premium emphasis. It must not be used as small body text on white.
- **Commercial clarity:** brand red is reserved for high-intent decisions (Buy Now, Sell Phone and search submission); do not color all buttons red.
- **Readable shopping:** off-white `#F5F7FA` page background with white catalog/data surfaces.
- **Operational precision:** dashboard data tables use neutral surfaces, semantic status signals, and appropriately dark labels rather than colored gradients.

## Canonical palette

| Role | Hex | Primary use |
| --- | --- | --- |
| Primary navy | `#101C33` | Desktop shell, trust surfaces, primary controls |
| Dark navy | `#0B1220` | Hero, optional dark mode |
| Light surface | `#F5F7FA` | Shopping background |
| White | `#FFFFFF` | Cards, panels, dialogs |
| Brand red | `#DC2626` | Conversion CTA |
| Red hover | `#B91C1C` | Commerce CTA hover |
| Antique gold | `#C49A4A` | Premium borders, motifs, highlights |
| Readable gold ink | `#845C1C` | Gold-toned small text on white |
| Light gold highlight | `#F7EEDC` | Soft gold category/badge background |
| Text primary | `#172033` | Light-mode body copy |
| Text secondary | `#526174` | Light-mode subdued content |
| Focus ring | `#294B79` | Light-mode keyboard outlines |
| Success | `#15803D` | Verified status, available operations |
| Warning | `#B45309` | Caution/pending states |
| Error | `#B91C1C` | Error and destructive feedback |

The master prompt's `#64748B` is still a viable secondary metadata color but `#526174` improves light-background contrast for small text. Dark mode uses `#E4BD7D` on navy for readable navigation emphasis, and darker gold surfaces for category selections.

## Verified contrast calculations (WCAG AA for normal text)

| Foreground / background | Ratio |
| --- | ---: |
| Navy `#101C33` / white | 16.99:1 |
| Body `#172033` / `#F5F7FA` | 15.16:1 |
| Muted `#526174` / white | 6.32:1 |
| Antique gold `#C49A4A` / navy | 6.53:1 |
| White / brand red `#DC2626` | 4.83:1 |
| Gold-ink `#845C1C` / white | 5.95:1 |
| Navy / light gold `#E4BD7D` | 9.61:1 |
| Dark muted `#B9C7DB` / dark card `#142139` | 9.38:1 |

These are computed color-pair ratios, **not** a claim of whole-page or WCAG 2.2 certification.

## Semantic token contracts

Use `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border`, and `ring-ring` from `src/index.css` / `tailwind.config.ts`. Brand red uses `--brand-red`; gold uses `--gold` and `--gold-ink`. Global custom themes may override `--primary` through the existing theme settings provider; that intended merchant-specific capability remains.

Avoid hardcoded electric blue `#3347FF` or neon lime `#D8FF3E` in newly built shared components. Category product art may preserve more colorful genuine brand/product photography where data permits.

## Interface standards

**Public storefront:** navy header and hero, white catalog cards, golden eyebrow/brand-mark, red search/buy actions. Hero benefits from a restrained navy gradient, not repeating glow effects.

**Customer dashboard:** light neutral cards; status green/red/amber only when their meaning is backed by real data; primary navigation navy.

**Store admin:** distinguish inventory, repairs, orders and finance using typography, semantic indicators and white space rather than unrelated saturated themes.

**Staff admin:** dense but legible lists, accessible focus rings, secondary muted text for non-critical metadata and no decorative traffic-light KPI cards.

**Super admin:** navy information architecture, high-contrast data and subtle gold accent bars. Critical incidents should use actual error/warning semantics instead of decorative red.

## Typography and layout

- **Manrope:** body, forms, tables, prices and controls.
- **Syne:** English display headlines only.
- **Noto Sans Devanagari:** Nepali content and bilingual interfaces.
- Heading hierarchy and line-height must stay legible at 320/360/375/390/430/768/1024/1280/1440/1920px.
- Motion-safe hover feedback must never be the only feedback. Focus-visible outlines and real active/disabled states are required.

## Implementation locations

- `src/index.css`: canonical light/dark tokens and base utilities.
- `src/styles/design-system.css`: premium shared patterns and CTA hierarchy.
- `src/styles/storefront-v3.css`: scoped homepage hero and categories.
- `src/components/layout/Header.tsx`, `NavigationBar.tsx`, `BottomNav.tsx`: visual shell.
- `src/components/products/ProductCard.tsx`: product action colors.
- `src/components/sections/EcommerceHomeSection.tsx`: storefront accent text.
- `tailwind.config.ts`: font families and named semantic color mappings.
- `src/test/brandPalette.test.ts`: token and contrast regression suite.

## Mandatory verification

Run `npm run build`, `npm test`, `npm run check-routes`, and perform light/dark/manual browser review for the viewports above. Confirm no fallback text colors, CMS theme overrides or dynamic styles erase selected brand text readability. Use screenshot/visual comparison before approving a production release.

**Known independent blockers:** full TypeScript CI remains red due to database type drift (issue #4); npm production dependency audit remains red (issue #5). Do not bypass these or deploy based on passing visual/color tests alone.
