# Super Admin End-to-End Operations Plan

**Project:** TamrakarComplex marketplace  
**Status:** Implementation roadmap with an initial working UI integration proposed in `feat/suadmin-ops-integrity-20261027`.  
**Scope:** Public marketplace, user portal, staff admin, store admin, platform admin, and super admin.

## 1. Single control plane, not duplicate admin systems

Use `/suadmin` as the owner's control plane, `/suadmin/workflows` as the unified queue, and existing feature managers for the actual mutations. The route is a view, **not** a separate database or parallel source of truth.

```text
Public UI / User UI / Store Admin UI / Staff Admin UI
                      |
       Auth session + route guard (UX)
                      |
           Supabase Data API / RPC
                      |
       Postgres tables + RLS + triggers
                      |
     Orders / Requests / Tasks / Audits
                      |
      Super Admin unified monitoring UI
```

**Security boundary:** Router restrictions are not authorization. Every read/write must be enforced by RLS or a role-checking RPC server-side. Publishable keys are appropriate for the frontend; secret/service-role keys must not be shipped to the browser.

## 2. Canonical work and service records

| Functional domain | Source-of-truth table | Customer entry | Operations UI | Completion evidence |
| --- | --- | --- | --- | --- |
| Staff assignments | `admin_tasks` | Internal | `/suadmin/team-access?tab=tasks`, `/staffadmin/tasks` | `status`, `completed_at`, audit |
| Store assignments | `admin_tasks` for cross-role assignment; review `store_tasks` migration strategy before consolidation | Internal | `/suadmin/store-admin-tasks`, store admin tasks | Store-bound assignment + audit |
| Repairs | `repair_requests` | `/repair/custom`, `/repair/book` | `/suadmin/repairs`, `/storeadmin/repairs` | Tracking + status transition |
| Unlocking | `unlock_requests` | `/unlocking` | `/suadmin/unlocking`, store admin unlocking | Status + approved fulfillment |
| Valuation / trade-in | `sell_phone_leads` | `/sell-your-phone` | `/suadmin/valuation` | Quoted offer and customer follow-up |
| Commerce | `orders` + order items | `/checkout` | `/suadmin/orders`, `/storeadmin/orders` | Payment, fulfillment, delivery |
| Store onboarding | `store_applications`, `stores`, `store_admins` | `/stores/apply` | `/suadmin/store-network` | Verified store with scoped owner |
| Content | Articles, guides, content pages | Public content | `/suadmin/publishing` | Published revision + audit |
| Governance | `user_roles`, permissions, `audit_logs` | Internal | `/suadmin/team-access`, `/suadmin/audit` | Role or policy change event |

`staff_tasks` and `store_tasks` already exist in migrations/hooks, while the active staff task UI uses `admin_tasks`. **Do not silently merge tables or double-write** without a data inventory and a migration of consumers. In this phase, the unified queue reads only `admin_tasks` for staff assignments.

## 3. Correct end-to-end service lifecycle

1. Customer submits a service request: server writes exactly one request row and tracking identifier, and creates a customer-visible status.
2. Intake queue shows unassigned cases. Missing store associations must **not hide** a new case.
3. Authorized operator assigns store/staff through checked RPC; store admins can only see cases assigned to stores they manage.
4. Service provider records inspection, quotation, customer approval, in-progress work, completion, and handover.
5. Every meaningful transition records actor, timestamp, permitted state transition, and customer notification intent.
6. Customer tracking (`/repair/track`, user repair history) displays only safe customer-visible status. Internal notes and pricing overrides must remain private.
7. Super Admin sees workload, exceptions, SLA breaches, reopenings and audit trace; does not bypass required evidence for sensitive actions.

Existing repair mutations use `assign_repair_to_store`, `transition_repair_status`, and `update_repair_admin_fields`. Preserve those RPC boundaries and verify their permission checks before deployment.

## 4. Unified workflow screen: first delivery

`/suadmin/workflows` contains four live lanes: staff tasks, repairs, unlocking, valuation. Each loads up to **75 newest records**; counts are marked as a loaded sample, not total system metrics. Features: filters by queue and open/closed state, text search, urgency order, refresh, visible per-source query failures, and links to role-aware management screens. It deliberately performs no independent cross-table writes.

The dashboard now fetches task and pending-service counts from existing tables; it does not claim fabricated system uptime, storage health, or API availability. A query failure must show an unavailable state rather than 0.

## 5. Access model (apply at database, not only frontend)

| Action | Super Admin | Staff Admin | Store Admin | Customer |
| --- | --- | --- | --- | --- |
| Review whole-platform operations | Yes | Only permitted modules | Own stores only | Own records only |
| Create/assign staff tasks | Yes | Only if explicitly delegated | No | No |
| Update assigned task state | Yes | Own assigned tasks | Own delegated tasks | No |
| Assign repair to store | Yes | Only with repair assignment grant | Own store workflow only | No |
| View private service notes | Yes | Explicit permission | Own assigned case only | No |
| Manage global roles and payments | Yes with audit | Explicit limited permission | Never global | Never |
| Review audit of platform privilege changes | Yes | Limited own context | Limited store context | No |

Use least privilege, deny by default, and do not infer roles from editable profile metadata. Confirm that RLS covers `admin_tasks`, `repair_requests`, `unlock_requests`, `sell_phone_leads`, `orders`, and their child tables. Review SECURITY DEFINER functions, parameter validation, `search_path`, and execute grants.

## 6. Route management conventions

Keep one canonical destination for each domain. Redirect aliases **before** the legacy `/:slug` catch-all; never let single-segment store slugs shadow reserved public words. Preserve query string and path parameters when redirecting appropriate old URLs. Use stable tab parameters for section hubs, and ensure every sidebar link has an actual reachable route and role guard.

Primary clusters:
- `/suadmin`: owner command center; `/suadmin/workflows`: cross-domain queue
- `/suadmin/team-access`: roles, permissions, tasks, performance
- `/suadmin/operations`: product/pricing, commerce, after-sales
- `/suadmin/store-network`: onboarding, store admins, store staff
- `/suadmin/billing`: subscriptions, payment providers, payouts
- `/suadmin/publishing`, `/suadmin/engagement`, `/suadmin/growth`, `/suadmin/system`: specialized back offices

Existing `/admin`, `/staff`, `/staffadmin`, `/storeadmin`, and `/user` panels should reuse domain services instead of duplicating database logic.

## 7. Remaining implementation milestones

### P0 — production reliability and security
- Run full CI: `npm ci`, `npm run check-routes`, `npm run check:migrations`, `npm test`, `npm run lint`, `npm run build`.
- Connect a staging Supabase project; compare live schema with migrations and generated `Database` types. The Supabase connector is currently not linked, so no migration was applied here.
- Verify RLS and RPC authorization with separate suadmin/staffadmin/storeadmin/customer identities. Specifically test cross-store access, role revocation, final-superadmin protection, and server-side status transitions.
- Confirm the frontend's repair creation payload matches columns and RPC functions on the live database. Validate unassigned cases appear in Super Admin but not other stores.

### P1 — full case/task linkage
- Design migration to add typed `resource_type` and `resource_id` references to `admin_tasks`, plus a constraint/validation mechanism, indexes, and assignment history. Do not add generic cross-table foreign keys with no server-side ownership validation.
- Add an event ledger for transitions, immutable audit references, and real notifications/outbox delivery (SMS/email/in-app) after successful transactions.
- Build one case detail timeline UI, internal comments with ownership checks, file attachments with private storage policies, SLA timestamps, and evidence-backed closure/reopen.
- Consolidate or deprecate legacy `staff_tasks` and `store_tasks` only after inventory, migration, and compatibility release.

### P2 — analytics, scale, and operating quality
- Server-side pagination, filters, and summary RPCs instead of client-side 75-row samples.
- Genuine health-check endpoints, background monitoring, and measured uptime. No invented percentages.
- Search indexes, deduplication, rate limits, idempotency for submissions and payments, and safe retries.
- Scheduled reconciliation of orders/payments/stock/payouts; store-specific performance and actionable exception alerts.
- Accessibility, responsive dashboards, skeleton/error/empty states, low-bandwidth design, Nepali/English labels, and mobile operational workflows.

## 8. Acceptance test matrix

1. Public anonymous user submits a repair request exactly once; receives tracking ID.
2. New unassigned repair appears in Super Admin queue.
3. Store Admin of unrelated store cannot read or mutate it.
4. Authorized assignment makes repair visible only to assigned store.
5. Customer sees public status but cannot read internal notes.
6. Invalid repair status transition fails server-side.
7. Service completion records actor and timestamp.
8. Super Admin can create a task with role, module, priority and due date.
9. Assigned Staff Admin sees the task, updates status, and cannot reassign to a different user.
10. Unrelated Staff Admin cannot access or edit that task.
11. A task query permission error appears as error, not “No tasks.”
12. Missing/failed DB counts display unavailable, not 0 or all-green.
13. `/suadmin/workflows` only loads for Super Admin.
14. Navigation, tabs, aliases and browser back/forward resolve deterministically.
15. Order and subscription data remains store- and user-scoped.
16. The route catch-all does not intercept `/repair`, `/shop`, or other reserved routes.
17. No service-role secret is embedded in the compiled JS.
18. Restore migrations and regression-test RLS in staging; review Supabase security advisors.
19. Run browser tests for empty, pending, assigned, completed, and error conditions.
20. Release to production only after staging confirmation and rollback preparation.

## 9. Release policy

This branch is for review: **do not auto-merge to main or apply a live migration** without verification. Local preview at `127.0.0.1:8080` cannot be reached from the connected GitHub tool; the user-provided `npm run build` status predates these changes. Record CI results and stage DB/RLS tests in the pull request before production deployment.
