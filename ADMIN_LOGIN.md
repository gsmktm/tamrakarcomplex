# Admin / Super Admin Login

## Platform Architecture

Tamrakar Complex uses a 4-panel architecture:

1. **Super Admin (`/suadmin`)**: Full platform control.
2. **Staff Admin (`/staffadmin`)**: Operations and moderation.
3. **Store Admin (`/storeadmin`)**: Merchant management.
4. **User Dashboard (`/user`)**: Personal profile and history.

## Development Credentials

Use these credentials to test the different panels in development:

| Role | Email | Password | Panel |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `suadmin@tamrakarcomplex.com` | `password` | `/suadmin` |
| **Super Admin (Backup)** | `gsmktm@gmail.com` | `password` | `/suadmin` |
| **Staff Admin** | `admin@tamrakarcomplex.com` | `password` | `/staffadmin` |
| **Store Admin** | `store@tamrakarcomplex.com` | `password` | `/storeadmin` |
| **Standard User** | `user@tamrakarcomplex.com` | `password` | `/user` |

Login at `/auth`. The system will automatically redirect you to the correct panel based on your role.

## Verify from CLI

```sh
npm run verify:login
```

Or:

```sh
node verify_login.js --email suadmin@tamrakarcomplex.com --password password
```

## Promoting Users

To grant super admin privileges to an existing user:

```sh
npm run make:suadmin -- --target-email <email>
```

This will run the `bootstrap_admin` RPC which grants the `suadmin` role to the target user.
