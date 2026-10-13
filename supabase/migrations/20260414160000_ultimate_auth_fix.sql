-- Historical credential-reset migration intentionally disabled.
--
-- It previously deleted an existing super-admin Auth identity, recreated a
-- fixed-UUID user with a committed password, and directly granted privileges.
-- In current Supabase Auth, confirmed_at is also generated; direct writes
-- fail in isolated replay. No schema migration may reset credentials or
-- impersonate/create privileged users. Preserve this migration version as a
-- safe NO-OP for new installations; use authorized Auth administration.
SELECT 1;
