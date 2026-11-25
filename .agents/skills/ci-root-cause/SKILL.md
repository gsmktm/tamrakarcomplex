---
name: ci-root-cause
description: Diagnose failing TypeScript, lint, test, route, migration and build pipelines without hiding errors. Use when CI is red or code compilation fails.
---

# CI Root-Cause Diagnosis

Adapted engineering workflow informed by Matt Pocock's *diagnosing-bugs* and *tdd*, obra/superpowers *systematic-debugging*, and ECC *verification-loop*. See the source map for URLs.

1. Capture a specific failing workflow run, commit SHA and first real error (not the last cascade).
2. Reproduce locally with `npm ci`, then the exact failing command. If no executable checkout is available, mark local reproduction NOT RUN and rely on CI evidence without claiming a fix.
3. Cluster diagnostics by root cause: stale generated Supabase types, missing tables/columns, library API changes, import/typing mistakes, test-fixture errors, browser/runtime issues.
4. For each cluster, choose one public seam and write a regression test or focused static check. Do not apply `@ts-ignore`, `any`, fake schema entries or skipped tests as a substitute for a real fix.
5. Re-run the minimal command, followed by all gates. Record before/after error counts and affected files. Report remaining baseline failures.
6. Never modify deployment logic simply to mask failures. Build and CI quality gates must still return non-zero when checks fail.

Relevant project paths: `.github/workflows/ci.yml`, `src/integrations/supabase/types.ts`, `src/services/`, `src/test/`.
