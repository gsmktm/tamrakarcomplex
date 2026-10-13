-- Historical migration retained as a deliberate NO-OP for ordered replay.
--
-- The previous script deleted/rewrote four fixed-UUID Auth identities,
-- preconfirmed their emails, assigned privileged roles with a known password
-- and reassigned demo store ownership. Neither live nor fresh installations
-- should mutate Auth or commerce ownership during schema installation.
-- Test identities and demo stores must be created by a separate, explicitly
-- authorized development-only seed process in an isolated project.
SELECT 1;
