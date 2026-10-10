# Tamrakar release checklist

Run these checks from the repository root before release or publishing:

```bash
npm run build
npm test -- --run
npm run lint
npm run check-routes
npm run check:migrations
npm run chrome:check
```

## Expected results

- Build completes without TypeScript or bundling errors.
- Vitest passes all tests.
- ESLint reports no errors. Existing Fast Refresh warnings are non-blocking and tracked separately.
- Route checks report no broken internal links, missing API routes, or placeholder `href="#"` controls.
- Migration safety reports no unsafe changed migration files.
- Browser checks validate HTTP status and the Vite app shell. If Chrome headless DOM capture times out, the command reports that as an environment diagnostic while still failing confirmed HTTP/app-shell problems.

## Protected access checks

- Role lookup failures must not silently elevate or demote users.
- Staff and store permission lookup failures must show a retryable unavailable state and keep protected content locked.
- Store-admin data queries must remain scoped to active store membership.
- Destructive admin mutations must use confirmation and preserve audit records where supported.

## Supabase boundary

Read-only schema/RLS inspection is safe during review. Apply schema, policy, function, or trigger changes only through a reviewed migration. Never commit service-role keys or other server secrets.
