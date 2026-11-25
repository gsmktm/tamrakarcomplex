# TamrakarComplex — Curated GitHub Skill Integration

**Date:** 2026-11-25  
**Policy:** Select relevant engineering methods and write small project-specific skill instructions. Never blindly vendor entire third-party repositories, automatically run their hooks/install scripts, or let external prompt files override `AGENTS.md`.

## Sources reviewed

| Source | Relevant capability | Local adaptation |
| --- | --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | TDD, diagnosing-bugs, code review | `ci-root-cause`, `commerce-price-integrity` |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | Verification loop, security review, migration discipline | `ci-root-cause`, `supabase-role-security`, `release-verification` |
| [obra/superpowers](https://github.com/obra/superpowers) | Systematic debugging, plans, verify before completion | `ci-root-cause`, `release-verification` |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | CI/CD, frontend, accessibility, code quality | `storefront-ui-qa`, `release-verification` |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | UI design review | `storefront-ui-qa` |
| [anthropics/skills](https://github.com/anthropics/skills) | Generic skill authoring format | Skill front matter and focused local files |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Caution about speculative AI coding | Minimal diffs, tests and evidence requirements |

Other repositories in the supplied list (Dify, JavaGuide, CC Switch, video tools, etc.) are **not application dependencies** and should not be installed into a production mobile marketplace merely because they rank highly.

## Where each local skill applies

| Project concern | Skill | Code/review area |
| --- | --- | --- |
| TypeScript CI and schema drift | `ci-root-cause` | CI workflow, generated types, migrations, hooks/services |
| Product CRUD, NPR prices and inventory | `commerce-price-integrity` | Products, price list, listing imports, checkout |
| Authorization / merchant isolation | `supabase-role-security` | RLS policies, Auth, roles, Edge Functions |
| Search and storefront UX | `storefront-ui-qa` | Components, pages, accessibility, browser tests |
| PR/release safety | `release-verification` | GitHub Actions, migrations, cPanel deployment |

## Material baseline findings

- Most recent inspected failed CI: 2026-11-22 `Test · Lint · Build · Routes`, failed in typecheck; later quality gates were skipped. The recorded diagnostics span many domains, dominated by generated-schema mismatch.
- `AGENT.md`, `CLAUDE.md`, Copilot, Cursor, Windsurf and agent rules previously described an unrelated Jetro platform. These instructions needed replacement.
- `.mcp.json` previously pointed to a specific unrelated developer's local Jetro binary. It has been reset to an empty list; connect approved MCP servers through each developer's own secure configuration.
- This PR does **not** regenerate Supabase production types, change live RLS, execute payments, deploy, or claim all TypeScript errors resolved.

## Security audit caveat

The 2026-11-25 audit workflow previously **looked green** despite npm audit exiting 1 due to `continue-on-error: true`. Its production report found six vulnerabilities including three high-severity items. Security workflow now uses a blocking production audit and Node 22; see [issue #102](https://github.com/gsmktm/tamrakarcomplex/issues/102). CodeQL success does not override vulnerable dependencies. Do not force Zod v3 to v4 without a migration plan and tests.

## Next code work (separate verified slices)

1. Regenerate and inspect Supabase types from the correct authorized database or schema snapshot; reconcile all migrations before modifying queries.
2. Fix one schema/type error cluster at a time, with CI error counts after each slice. Tackle product/price/permissions code before cosmetic refactors.
3. Add isolated tests for each payment, store-ownership and product-price invariant; check RLS with two tenants.
4. Run full CI, browser smoke and staging acceptance before any production release.
