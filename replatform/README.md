# TamrakarComplex Replatform

This folder is the parallel Next.js + NestJS + Prisma replatform for TamrakarComplex.com.

It is intentionally separate from the current Vite/Supabase app so the production site can remain stable while the new platform is built and migrated.

## Workspaces

- `apps/web` - Next.js App Router frontend.
- `apps/api` - NestJS backend API.
- `packages/domain` - shared package, referral, point, and role business logic.
- `prisma` - PostgreSQL schema and seed defaults.

## First Run

```sh
cd replatform
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev:api
npm run dev:web
```

## Route Contract

The scaffold preserves the current route spirit:

- `/`
- `/stores`
- `/stores/[slug]`
- `/stores/[slug]/products`
- `/stores/[slug]/valuation`
- `/stores/[slug]/repair`
- `/stores/[slug]/exchange`
- `/stores/[slug]/accessories`
- `/stores/[slug]/offers`
- `/marketplace`
- `/repair`
- `/exchange-your-phone`
- `/sell-your-phone`
- `/valuation-estimator`
- `/products`
- `/product/[slug]`
- `/mobile-price`
- `/suadmin`
- `/staffadmin`
- `/storeadmin`
- `/user`

## Design Rule

Keep the Tamrakar design spirit: premium digital complex, dense but readable admin tools, mobile-first store/customer journeys, and soft “central harmony with many connected stores” philosophy. Do not use literal religious visuals.
