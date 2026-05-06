# AI Architecture

## Stack

- React 18 + TypeScript
- Vite
- React Router v6
- TanStack Query
- Supabase auth, database, storage, RPCs, and edge functions
- shadcn-ui/Radix primitives in `src/components/ui`
- Tailwind CSS, `src/index.css`, `src/App.css`, and `src/styles/dynamic-theme.css`

## Runtime Composition

`src/main.tsx` mounts `App`.

`src/App.tsx` sets up:

- `QueryClientProvider`
- `HelmetProvider`
- `ThemeProvider` from `src/hooks/useTheme.tsx`
- `AuthProvider` from `src/hooks/useAuth.tsx`
- `CartProvider` from `src/contexts/CartContext.tsx`
- `TooltipProvider`
- global `Toaster`
- browser router and route groups
- system helpers: visitor tracking, site settings hydration, dynamic favicon, offline banner, live editor, scroll reset, WhatsApp button, maintenance gate, error boundary

## Routing Model

Routes are split by role and feature area.

- `publicRoutes.tsx` owns public pages, user dashboard/history/profile/settings, marketplace browsing/sell wizard, stores, repair, content pages, redirects, and auth-protected user routes.
- `staffAdminRoutes.tsx` owns `/staffadmin` and wraps the layout in `RequireStaffAdmin`. Individual pages often add module/action checks.
- `superAdminRoutes.tsx` owns `/suadmin` and wraps the layout in `RequireSuperAdmin`.
- `storeAdminRoutes.tsx` owns `/storeadmin` and wraps the layout in `RequireStoreAdmin`.
- `adminRoutes.tsx` redirects old `/admin/*` URLs to `/staffadmin`.

Route guards:

- `RequireAuth` checks logged-in state and optional allowed roles.
- `RequireStaffAdmin` checks role plus staff permission module/action when provided.
- `RequireSuperAdmin` requires `suadmin`.
- `RequireStoreAdmin` requires `storeadmin`.
- `RequireAdmin` is a legacy/shared admin guard.

Navigation configuration is centralized in `src/config/panelNavigation.ts`. Permission filtering is handled by `src/lib/permissions.ts` and `src/lib/adminMenu.ts`.

## Role Model

App roles are the four-panel architecture:

- `suadmin`
- `staffadmin`
- `storeadmin`
- `user`

Role helpers:

- `src/lib/roles.ts` normalizes legacy roles like `admin`, `store_owner`, `moderator`, `public_user`, and `customer`.
- `src/hooks/useAuth.tsx` resolves role in this order: `get_my_roles` RPC, `user_roles` table, email/metadata fallback, then `user`.
- `src/lib/authRedirects.ts` maps roles to dashboard/profile paths and protects local redirects.
- `src/lib/permissions.ts` defines staff permission modules/actions and menu filtering.

## Source Layout

- `src/pages/` - route-level screens.
- `src/pages/admin/` - reusable manager screens used by staff/super/store panels.
- `src/pages/suadmin/` - super admin-specific pages.
- `src/pages/staffadmin/` - staff admin-specific pages.
- `src/pages/storeadmin/` - store admin-specific pages.
- `src/pages/user/` - user account pages.
- `src/components/` - shared UI and feature components.
- `src/components/ui/` - shadcn/Radix UI building blocks.
- `src/hooks/` - React Query hooks, auth/theme/profile hooks, feature-specific data hooks.
- `src/services/` - imperative service functions for submission, catalog, store directory, repair, valuation, imports.
- `src/lib/` - pure helpers, security, role, permission, SEO, audit, package, theme, and Supabase edge utility code.
- `src/types/` - local TypeScript models.
- `src/data/` - local static seed/navigation/article data.
- `src/integrations/supabase/` - Supabase client and generated types.
- `supabase/functions/` - Deno edge functions.
- `supabase/migrations/` - SQL schema, policies, functions, seed/hardening changes.

## UI Patterns

- Prefer existing components from `src/components/ui`.
- Use `lucide-react` icons where icons are needed.
- Feature components often pair with a hook or service instead of doing all Supabase logic inline.
- Public pages usually use `SEO`, layout/header/footer components, section components, and hooks.
- Admin manager pages often call Supabase directly; when adding new shared behavior, prefer a hook/service only if it reduces duplication across managers.

## Data Access Pattern

- Client data calls use the exported `supabase` from `src/integrations/supabase/client.ts`.
- React screens typically use TanStack Query hooks from `src/hooks`.
- Form submissions or multi-step business actions often use `src/services`.
- Edge functions are invoked either through Supabase functions or direct HTTP depending on the module.
- RLS and RPC functions are critical. Check migrations before assuming a table can be read/written by a role.

## Editing Risks

- Shared admin pages can affect multiple panels.
- Store-scoped pages must not expose data for stores the user does not own/admin.
- Staff admin pages need permission module/action checks in both navigation and route/page behavior.
- Supabase type drift is expected; do not blindly replace the untyped runtime client with strict typing unless schema generation is refreshed.
- Several migrations supersede older migrations. When documenting final behavior, prefer latest hardening migrations and current code usage.

