# Tamrakar Complex — Hourly Engineering and Catalog Quality Watch

**Prepared:** 2026-10-30  
**Repository:** `gsmktm/tamrakarcomplex`  
**Release rule:** Never merge into `main` or deploy production unattended. A push to `main` can trigger the cPanel deployment workflow.

## Two separate layers

1. **ChatGPT scheduled engineering review** (configured separately in ChatGPT): hourly investigation with five perspectives — QA/uptime, product/catalog, frontend/commerce, backend/security, and feature/release. It may prepare small, reviewable draft PRs when access and verification permit. A scheduled instruction is *not* proof that independent agents ran or that any bug was resolved.
2. **GitHub Actions quality watch** (`.github/workflows/hourly-commerce-quality-watch.yml`): runs once per hour **only after this workflow is merged to the default branch**. A draft PR does not activate GitHub's default-branch cron. Safe manual/PR runs may validate the watch before merging.

## Automated read-only checks

- Public GET `/` and `/health` should return HTTP 2xx. Failure is a monitoring signal to investigate, not conclusive proof of an outage for all users.
- Parse the checked-in `src/data/latestMobileBuyingPrices.ts` static price list.
- Detect blank labels, duplicate brand/model variant combinations, non-positive or unsafe price values, malformed rows and non-positive comparison prices.
- Warn when `previousPrice < price`: this may be an actual price increase, **not** a discount. Do not modify values without authentic seller confirmation.
- Warn if the last supplied date in the list is more than 30 days old; an old date is not proof that every item is currently mispriced.
- Execute existing route and migration *static* validators, without DB credentials or migrations.
- On a scheduled failure, create or update a **single existing open GitHub incident issue**. Never create hourly duplicate incidents. Report file is stored as a short-lived artifact.

## Product data policy

- Separate official/imported reference prices from individual stores' actual listings, inventory and checkout prices.
- Prices, stock, photos, specifications, promotions and seller identities must come from verified authorized sources and remain merchant-confirmed.
- Do not automatically convert static price-list entries into live inventory, change product visibility, override store listing prices or execute payment/stock/refund mutations.
- Never claim an external supplier API integration unless documented credentials, contractual permissions and end-to-end tests are present.

## Agent responsibilities and human release gates

| Review perspective | Focus | Safe output |
| --- | --- | --- |
| QA/Uptime | Reproduction, site probes, broken links, regression | Issue with evidence, small draft fix |
| Catalog/Products | Models, duplicates, slugs, prices, images, availability | Data discrepancy report, validated code change |
| Frontend | Search/filter, mobile, product detail, cart, checkout | Test-backed draft PR |
| Backend/Security | RLS, roles, merchant isolation, repair/exchange, migrations | Review + tests; no live mutations |
| Feature/Release | Prioritized gaps, performance, accessibility, support | Scoped feature proposal / draft PR |

**Before production:** strict TypeScript, lint, tests, routes, build, browser E2E, staging Supabase/RLS, payments, backup/rollback and explicit release approval. Earlier PRs reported significant TypeScript and historical migration drift; do not report the platform production-ready based on partial CI results.

## What is still not connected

The static audit does **not** inspect production Supabase records, store-level live stock, the cPanel server logs, payments, private administrative dashboards or external suppliers. Those require appropriate least-privilege integrations and separate safe staging validation.

## How to inspect

- GitHub Actions → *Hourly Commerce Quality Watch*
- GitHub Issues → *[Hourly watch] Tamrakar quality audit needs attention*
- Download `tamrakar-product-audit` from a workflow run to see the static catalog findings.
- Script can run locally using `node scripts/audit-product-price-list.cjs`.

The watch reports problems; fixes and new features are made by reviewed branches/PRs, not guessed catalog updates or unreviewed live deployment.
