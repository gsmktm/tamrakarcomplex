# TamrakarComplex — Claude Code Instructions

Follow [AGENTS.md](AGENTS.md) as the source of truth. Consult `docs/engineering/SKILL_SOURCE_MAP.md` before selecting optional skills.

Core workflow: inspect → reproduce → test first → minimal fix → verify → reviewable PR. Never bypass Supabase RLS, weaken CI, or deploy/migrate production without authorization.
