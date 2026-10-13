# Database migration consolidation and release gates — 13 October 2026

## Scope and evidence

The Tamrakar Complex repository contains hundreds of historical migrations,
two incompatible generations of order schema (`orders.buyer_id` versus
`orders.user_id`), repeatedly redefined security-definer role RPCs,
and legacy one-off Auth/bootstrap scripts. The checked-in
`src/integrations/supabase/types.ts` does not match all application's
references to tables, columns and RPCs; strict TypeScript currently fails.

Only **isolated Supabase Docker migration replay** is being used for migration
testing. The connected Supabase account returned **no accessible Tamrakar
project**. Therefore **no live schema, user, privilege, RLS, or payment
change has been made** and live-state assertions are not justified.

## Cleanup committed to draft PR #3

1. Moved three **non-timestamped** SQL files out of
   `supabase/migrations/` and into
   `docs/sql/legacy-not-for-execution/` with a clear warning:
   - `_fix_migration_tracking.sql` — attempts to insert migration-version
     records without proving the underlying schema was actually applied.
   - `fix_gsmktm_suadmin.sql` — manual privileged role grant for a named user.
   - `repair_service_fix_all.sql` — manually executable schema/RLS overrides
     that overlap timestamped migrations and are not verified for production.
   These files were **not recognized by timestamp-based migration replay**.
   Their reference bytes are preserved as `.sql.txt`, not active migrations.
2. Updated `DEPLOYMENT.md` to remove unsafe instructions to execute manual
   privileged patches and prohibit unreviewed live `supabase db push`.
3. Corrected migration ordering conflicts found through real Docker replay:
   early `app_role` / `user_roles` creation with RLS enabled, legacy
   `buyer_id` to `user_id` ownership backfill, stable PostgreSQL RPC
   parameter/return contract, directory RPC return-shape replacement,
   and early canonical roles. These are **clean-install history fixes**.
4. Disabled one known-credential administrator bootstrap SQL. Remaining
   historical Auth SQL needs **separate security review** (Issue #8).

## Why we must NOT squash or delete timestamped migrations yet

Supabase stores applied versions in
`supabase_migrations.schema_migrations`. A historical file edit affects new
installs but **does not rerun against a deployed database**. Squashing,
renaming or deleting an applied migration before inspecting live history can
cause drift, replay conflicts or data loss. A future baseline may be created
only after:

- obtain authorized **read-only** snapshots of `schema_migrations` and
  the actual Tamrakar schema, including RLS policies and function signatures;
- compare local schema and actual live database, with a tested restoration
  backup and preservation plan for accounts, orders, balances and payments;
- generate a canonical baseline from an isolated database that **fully
  replays**, not from guessed SQL or a partial generated type file;
- prepare **additive** live-upgrade migrations for drift and version history;
- pass offline and staging RLS tests for anonymous, customer, store staff,
  store admin, staff admin and super admin roles, including negative tests;
- preserve transactional state and idempotency for checkout, payment
  verification, commission creation, refunds and retries.

## Release acceptance gates — all must be green

| Gate | Required acceptance evidence |
| --- | --- |
| Migration replay | Clean isolated fresh install of **all** timestamped migrations, `supabase gen types` succeeds |
| TypeScript | `tsc` succeeds with errors fixed at actual table/RPC/contract sources; do not suppress errors |
| Security | Full reviewed RLS and SQL function privilege tests; production and development dependency assessment |
| Payments | COD/eSewa idempotency and sandbox callback tests; Khalti remains disabled until SQL atomic checkout contract supports it, with sandbox transaction and refund/retry tests |
| Staging | Correct Tamrakar project selected; RLS, secrets, auth and migrations verified without touching an unrelated project |
| Delivery | Code review, backups, migration diff, main-branch auto-deploy impact, and explicit approval for production rollout |

**Current status:** this PR is a work-in-progress, not a database deployment
or production-ready merge. Track [schema/type issue #4](https://github.com/gsmktm/tamrakarcomplex/issues/4),
[payment issue #6](https://github.com/gsmktm/tamrakarcomplex/issues/6),
and [legacy Auth issue #8](https://github.com/gsmktm/tamrakarcomplex/issues/8).

## No direct privilege changes

Do not execute the archived files. Administrator creation must occur through an
explicitly authorized Supabase Auth administration workflow, and privileged
roles must be set through audited authorized methods; never through embedded
user emails and passwords in migration SQL. No customer accounts should be
created or modified by schema replay.
