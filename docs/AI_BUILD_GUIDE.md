# AI Build Guide

## Commands

From repo root:

```sh
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run check-routes
```

Supabase helpers:

```sh
npm run supabase:version
npm run supabase:start
npm run supabase:status
npm run supabase:reset
npm run supabase:functions
```

## Environment

Required frontend env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge functions may require additional Supabase/service/payment provider environment variables. Check each function under `supabase/functions/<name>/index.ts`.

## Before Editing

1. Ignore `node_modules/` and `dist/`.
2. Read `docs/AI_README.md`.
3. Identify the feature area:
   - Public page: `src/pages`, `src/components/sections`, `src/components/home`, hooks.
   - Admin page: route group + shared manager page + permission helper.
   - Store page: store admin route + store scoping query.
   - Backend data: migrations + edge function + hook/service.
4. Search with `rg` for table names, route paths, and exported hooks.
5. Check existing patterns before adding new abstractions.

## Adding A Public Feature

1. Add route-level page under `src/pages` or a focused component under `src/components`.
2. Add route in `src/routes/publicRoutes.tsx`.
3. Add data hook in `src/hooks` if the page reads data repeatedly or needs cache state.
4. Add service in `src/services` if the feature performs multi-step writes or validation.
5. Add types in `src/types` only when shared across files.
6. Add SEO metadata with existing SEO helpers/components.
7. Run build and targeted tests.

## Adding An Admin Feature

1. Decide which panels need it: `suadmin`, `staffadmin`, `storeadmin`.
2. Add page under the most specific folder, or reuse `src/pages/admin` if shared.
3. Add route in the right route file.
4. Add navigation item in `src/config/panelNavigation.ts`.
5. For staff admin, add or reuse a module key in `src/lib/permissions.ts`.
6. Ensure Supabase queries are role-scoped:
   - `suadmin`: platform-wide access is expected.
   - `staffadmin`: permission-gated access.
   - `storeadmin`: store-owned/store-assigned data only.
7. Confirm RLS/RPC support in migrations.

## Adding Or Changing Data

1. Add a migration in `supabase/migrations/` with a timestamped name.
2. Include RLS policies for every new table.
3. Add indexes for common filters (`user_id`, `store_id`, `slug`, `status`, `created_at`).
4. Add RPCs when client-side RLS cannot safely express the operation.
5. Update hooks/services and local types.
6. Refresh generated Supabase types when possible.
7. Add a test or checklist item for the affected flow.

## Hook Pattern

Common read hook pattern:

```ts
export function useThing(id: string | null | undefined) {
  return useQuery({
    queryKey: ["thing", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("things").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}
```

Common mutation pattern:

```ts
const queryClient = useQueryClient();

return useMutation({
  mutationFn: async (payload) => {
    const { data, error } = await supabase.from("things").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["things"] }),
});
```

Prefer existing hook/service conventions in nearby files over copying these examples exactly.

## Security Checklist

- Validate and sanitize public form inputs with helpers from `src/lib/security.ts`.
- Never trust a hidden admin menu as authorization.
- Keep store admin data filtered by store membership/ownership.
- Do not expose service-role keys in frontend code.
- Use edge functions for privileged operations.
- Check RLS policy and RPC behavior before adding direct client writes.
- Avoid hardcoded role emails except where existing compatibility helpers already centralize them.

## Testing Checklist

Run at least one of:

- `npm run build` for TypeScript/bundle safety.
- `npm run lint` for static checks.
- `npm run test` for Vitest tests.
- `npm run check-routes` after route changes.

Manual flows worth checking for larger changes:

- Public browse/search/detail pages.
- Auth login/logout and role redirects.
- User dashboard/history/profile.
- Staff admin permission-gated page.
- Store admin store-scoped page.
- Super admin manager page.
- Checkout/order/payment flow if commerce changed.
- Repair request/tracking if repair changed.

## Common Pitfalls

- There are duplicate-ish concepts: `sell_listings` and `marketplace_listings`, `staff_permissions` and `staffadmin_permissions`, `chatbot_config` and `chatbot_configs`. Search current code usage before consolidating.
- Some shared manager pages are mounted under multiple route groups. Scope changes carefully.
- Supabase generated types can be stale. Do not block a runtime fix only because `types.ts` is behind, but do update types when feasible.
- Migrations include legacy fixes and hardening passes. Latest dated migration usually wins.
- `publicRoutes.tsx` currently has both a real `/brands` route and a later `/brands` redirect to `/mobile-price`; React Router matching order matters, so inspect before changing route order.

