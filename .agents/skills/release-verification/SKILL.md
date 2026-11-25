---
name: release-verification
description: Validate changes before PR, merge, migrations or deployment with test evidence, security checks and explicit rollout/rollback status.
---

# Release Verification and Review

Draws on ECC verification-loop, obra/superpowers verification-before-completion and addyosmani/agent-skills CI/CD guidance.

## Required evidence

| Gate | Command |
| --- | --- |
| Dependencies | `npm ci` |
| Types | `npx tsc -p tsconfig.app.json --noEmit` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Routes | `npm run check-routes` |
| Migrations | `npm run check:migrations` |
| Build | `npm run build` |
| Browser (when supported) | `npm run chrome:check` |

- Capture exit codes and relevant logs. Mark each PASS, FAIL, NOT RUN or BLOCKED.
- Analyze authorization, RLS, payment/idempotency, invalid prices, stock and personal-data exposure.
- Review diff for test omissions, scope creep and secret leaks. Note baseline failures as debt; never relabel failures as success.
- Open a reviewable PR; production merge, migrations and deployment are separate release decisions. Have a rollback procedure and authorized acceptance check.
