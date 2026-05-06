# Tamrakar Complex — Web Platform

A full-stack web platform for Tamrakar Complex, featuring an e-commerce storefront, repair service booking, device valuation, marketplace listings, and multi-role admin panels.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, TailwindCSS, shadcn/ui |
| State/Data | TanStack Query v5, React Hook Form, Zod |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage + Edge Functions) |
| Routing | React Router DOM v6 |
| Payment | eSewa (Nepal), Cash on Delivery |
| Deployment | Netlify / Vercel / cPanel Node.js |

## AI/Project Documentation

For AI agents or new developers, start with [`docs/AI_README.md`](docs/AI_README.md). It links the architecture map, function index, data model, and build guide.

## Local Development

**Requirements:** Node.js >= 20.20.0

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd tamrakar-main

# 2. Install dependencies
npm install

# 3. Copy env template and fill in your Supabase credentials
cp .env.example .env

# 4. Start dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. See `.env.example` for the full list including edge function secrets.

**Required for build:**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon key

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full instructions covering Vercel, Netlify, and cPanel.

## Admin Roles

| Role | Panel | Access |
|---|---|---|
| `suadmin` | `/suadmin/*` | Platform-wide super admin |
| `staffadmin` | `/staffadmin/*` | Staff management |
| `storeadmin` | `/storeadmin/*` | Store-level management |
| `user` | `/account/*` | Standard user |

The default super admin account is `suadmin@tamrakarcomplex.com`. Run `fix_suadmin.sql` in the Supabase SQL Editor to create/reset it.
