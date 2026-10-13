# Tamrakar Complex — agent engineering contract

Project: **Tamrakar Complex**, digital mobile marketplace and store/repair management hub in New Road, Kathmandu. Read `.github/copilot-instructions.md` first for full rules and links to architecture. Do not reuse guidance for unrelated projects.

## Work ownership and agent orchestration
The lead agent decomposes work and asks specialist subagents to investigate independently when the runtime supports real delegation. The profiles are at `.github/agents/`: `tech-lead` (triage and integration), `schema-integrity` (Supabase/types), `frontend-craft` (UX), `security-review` (RBAC/RLS/payment), `test-reliability` (CI/E2E).

Never claim subagents ran merely because these files exist. Each scoped work item must include evidence, patch, test results, and unresolved blockers. Limit concurrent file writes to prevent conflict. Subagents should not create branches that overwrite other work or modify privileged systems without authorization.

## Current stop-the-line defect
GitHub issue #4 — stale checked-in Supabase type definitions caused >1,800 compile errors across ~150 files in strict CI. The *correct* live Tamrakar Supabase project is **not connected** to the presently available Supabase integration. Do not regenerate against unrelated project data, expand the schema by guessing, disable compiler checks, or alter production migrations as a workaround.

## Required verification commands
```bash
npm ci
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm test
npm run check-routes
npm run check:migrations
npm run build
npm run chrome:check
```

Regressions also run in `.github/workflows/storefront-regression.yml`, separately from mandatory CI. Each job is only evidence for the checks actually executed.

## Product invariants
Preserve canonical and legacy routes, verified search behavior, local seller privacy, carts and order lifecycle, repair tracking and store mapping. No invented commerce terms. No nested interactive controls. Keep backend operations permissioned, logged and idempotent. Prioritize accessibility and mobile usability.

## Deployment
Do not merge draft PR #3, promote Netlify/Vercel, migrate databases, send messages, or modify payment processors automatically. Only changes to the authorized GitHub feature branch are permitted for the current task; ask for specific approval before any production changes.
