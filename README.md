# Tamrakar Complex — Web Platform

**Status:** ✅ Production Ready (v1.2.0)  
**Last Updated:** June 12, 2026

A full-stack web platform for Tamrakar Complex, featuring an e-commerce storefront, repair service booking, device valuation, marketplace listings, and multi-role admin panels.

## 🚀 Quick Links

- **📖 Documentation Index:** See [`DOCUMENTATION.md`](DOCUMENTATION.md) for complete navigation
- **For New Developers:** Start with [`docs/AI_README.md`](docs/AI_README.md)
- **For Current Status:** See [`CHANGELOG.md`](CHANGELOG.md)
- **For Deployment:** See [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **For Architecture:** See [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, TailwindCSS, shadcn/ui |
| State/Data | TanStack Query v5, React Hook Form, Zod |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage + Edge Functions) |
| Routing | React Router DOM v6 |
| Payment | eSewa (Nepal), Cash on Delivery |
| Deployment | Netlify / Vercel / cPanel Node.js |

## Features

### Public Features
- ✅ E-commerce storefront with shopping cart
- ✅ Device repair service booking and tracking
- ✅ Automated device valuation
- ✅ Marketplace for buying/selling devices
- ✅ **Mobile hub** — Category browser, brand pages, model detail pages with pricing
- ✅ **Sell & Exchange unified flow** — `/sell-your-phone` with `?mode=exchange` toggle
- ✅ Store directory with filters
- ✅ User dashboard (orders, profile, settings)
- ✅ AI-generated articles and guides
- ✅ Newsletter subscription

### Admin Panels
- ✅ **Super Admin** (19 routes) — Platform analytics, user management, bulk operations
- ✅ **Staff Admin** (15+ routes) — Permission-gated content/repair/store management
- ✅ **Store Admin** (12+ routes) — Store-owned data and staff management
- ✅ **Mobile Master Manager** — Brand/series/model/variant hierarchy editor with price management
- ✅ **Audit Logging** — Full operation tracking

## Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Build | ✅ 0 errors | TypeScript strict, 0 errors |
| Tests | ✅ 41/41 passing | Full test coverage |
| Linting | ⚠️ warnings | Non-blocking, mostly `any` types |
| Database | ✅ 168+ migrations | Includes mobile catalog seed |
| Mobile Catalog | ✅ 18 brands, ~290 variants | Prices in NPR, exchange values seeded |
| Edge Functions | ✅ 7 functions | All deployed |
| Responsive Design | ✅ Complete | Mobile-first with bottom nav |

## 🛠️ Local Development

**Requirements:** Node.js >= 20.20.0

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd tamrakar-main

# 2. Install dependencies
npm install

# 3. Copy env template and fill in your Supabase credentials
cp .env.example .env

# 4. Start Supabase locally (optional)
npm run supabase:start

# 5. Start dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. See `.env.example` for the full list.

**Required for frontend:**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon key

**Optional:**
- `VITE_ESEWA_ENABLED` — set to `true` to enable eSewa payments
- `VITE_REQUIRE_SUBSCRIPTION` — set to `true` to require store subscriptions

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run build:dev        # Build in dev mode
npm run start            # Run Node.js server (production)
npm run lint             # Run ESLint
npm run test             # Run tests once
npm run test:watch       # Watch mode for tests
npm run check-routes     # Validate all routes
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:reset   # Reset local database
npm run supabase:functions # Run edge functions locally
```

## 🔐 Admin Roles & Login

| Role | Panel | URL | Permissions |
|------|-------|-----|-------------|
| `suadmin` | Super Admin | `/suadmin/*` | Platform-wide access |
| `staffadmin` | Staff Admin | `/staffadmin/*` | Permission-gated modules |
| `storeadmin` | Store Admin | `/storeadmin/*` | Store-owned data |
| `user` | User Dashboard | `/account/*` | Personal data only |

**Default Super Admin:** `suadmin@tamrakarcomplex.com`  
To create/reset: Run `supabase/migrations/fix_suadmin.sql` in Supabase SQL Editor

## 📦 Project Structure

```
src/
  ├── pages/              # Route-level screens
  ├── components/         # React components (organized by feature)
  ├── hooks/              # React Query hooks and custom hooks
  ├── services/           # Business logic and API calls
  ├── lib/                # Utilities, helpers, permissions
  ├── types/              # TypeScript type definitions
  ├── integrations/       # Supabase client and types
  └── routes/             # Route definitions by role

docs/
  ├── AI_README.md        # AI agent orientation
  ├── AI_ARCHITECTURE.md  # App structure and routing
  ├── AI_BUILD_GUIDE.md   # Development patterns
  ├── AI_DATA_MODEL.md    # Database schema
  └── AI_FUNCTION_INDEX.md # Exported functions

supabase/
  ├── migrations/         # Database migrations (~162 files)
  ├── functions/          # Edge functions (7 deployed)
  └── seeds/              # Seed data (optional)
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [CHANGELOG.md](CHANGELOG.md) | Feature status & current state |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy to Vercel, Netlify, or cPanel |
| [docs/AI_README.md](docs/AI_README.md) | For new developers & AI agents |
| [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) | App structure & routing |
| [docs/AI_BUILD_GUIDE.md](docs/AI_BUILD_GUIDE.md) | Development patterns & workflows |
| [docs/AI_DATA_MODEL.md](docs/AI_DATA_MODEL.md) | Database schema reference |
| [docs/AI_FUNCTION_INDEX.md](docs/AI_FUNCTION_INDEX.md) | Hooks, services, utilities |

## 🚀 Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for complete deployment instructions for:
- **Vercel** (recommended, 5-10 min setup)
- **Netlify** (10-15 min setup)
- **cPanel Node.js** (30-45 min setup)

Quick checklist:
- [ ] Run `supabase db push` to apply migrations
- [ ] Deploy edge functions: `supabase functions deploy <name>`
- [ ] Configure edge function secrets in Supabase dashboard
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in deployment env
- [ ] Verify storage buckets exist in Supabase dashboard
- [ ] Test payment flow with test eSewa account

## 🧪 Testing

```bash
npm test         # Run all tests
npm run test:watch  # Watch mode

# Tests are located in src/test/ and *.test.ts files
# Using Vitest as test runner
```

All 41 tests are passing. Lint output has 179 non-blocking warnings.

## 💡 Common Questions

**Q: How do I add a new feature?**  
A: See [docs/AI_BUILD_GUIDE.md](docs/AI_BUILD_GUIDE.md) for step-by-step patterns.

**Q: How do I understand the routing?**  
A: Check [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md#routing-model) for the role-based routing model.

**Q: Where is the database schema?**  
A: See [docs/AI_DATA_MODEL.md](docs/AI_DATA_MODEL.md) for all 60+ tables.

**Q: How do I find a specific function or hook?**  
A: Use [docs/AI_FUNCTION_INDEX.md](docs/AI_FUNCTION_INDEX.md) or search with `rg <name>`.

**Q: How do I deploy?**  
A: Follow [DEPLOYMENT.md](DEPLOYMENT.md) step-by-step.
