-- Historical developer-only Auth shortcut intentionally disabled.
-- The former migration updated auth.users email confirmations and/or
-- re-enabled first-user/email-allowlisted suadmin self-bootstrap.
-- No self-service administrator elevation or fake email confirmation
-- belongs in a schema migration. Stable disabled bootstrap RPC was created
-- earlier; the final additive migration locks it down for existing databases.
SELECT 1;
