---
name: supabase-role-security
description: Audit Supabase RLS, authorization, store membership, sensitive reads/writes and Edge Function trust boundaries. Use for auth, admin roles, data access and migrations.
---

# Supabase Roles, Ownership and Security

Based on ECC security-review and migration practices, tailored to this repository.

1. Map the actor: `suadmin`, `staffadmin`, `storeadmin`, `storestaff`, `user` and anonymous visitors. Identify the authenticated user and authorized store memberships.
2. Trace the request from UI to hook/service to Supabase query/RPC/Edge Function and finally the database's RLS/privileges. Client route guards do not establish authorization.
3. Validate SELECT, INSERT, UPDATE and DELETE separately. Check cross-tenant access and privilege escalation through mutable `store_id`, `user_id`, `role` and payment-state fields.
4. For changes, write additive reversible migrations, confirm required indexes and run migration safety checks. Never grant broad `anon` access to expedite tests.
5. Keep service-role keys on trusted servers only; never expose them via `VITE_*`. Reject untrusted amounts and payment success claims; verify them server-side.
6. Test both allowed and denied paths. Explicitly document production database verification as NOT RUN unless actually checked.
