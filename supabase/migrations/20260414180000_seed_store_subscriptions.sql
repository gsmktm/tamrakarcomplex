-- Historical random subscription seeding disabled on fresh installations.
--
-- The former migration assigned paid Diamond/Gold/Silver packages to random
-- existing stores, overwrote existing subscriptions through ON CONFLICT and
-- updated store subscription fields. A schema migration must not turn random
-- merchants into paid subscribers or alter entitlements.
-- Test-only fixtures belong in a separate explicitly authorized seed file,
-- not in the production migration history.
SELECT 1;
