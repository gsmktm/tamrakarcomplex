
-- 1. Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Define default user details
-- Super Admin: gsmktm@gmail.com / password / suadmin
-- Super Admin: suadmin@tamrakarcomplex.com / password / suadmin
-- Staff Admin: admin@tamrakarcomplex.com / password / staffadmin
-- Store Admin: store@tamrakarcomplex.com / password / storeadmin
-- Public User: user@tamrakarcomplex.com / password / user

-- Removed demo user seeding for production safety
