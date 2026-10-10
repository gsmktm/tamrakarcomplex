# Deployment Guide

## Architecture

```
GitHub (main branch)
    │
    ▼
GitHub Actions (CI: test → lint → build → smoke check)
    │
    ▼
GitHub Actions (Deploy: SFTP → cPanel + restart Node app)
    │
    ▼
cPanel (Node.js + Express serving Vite SPA)
    │
    ├── Static assets (dist/) — 1yr cache, content-hashed
    ├── index.html — no-cache (always fresh)
    └── API proxy (/api/*) → Supabase

Supabase (managed)
    ├── PostgreSQL + RLS
    ├── Auth
    ├── Edge Functions
    └── Storage
```

## Prerequisites

- cPanel account with Node.js support (Node 20+)
- SSH access to cPanel (for SFTP deployment)
- GitHub repository secrets configured

## GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SITE_URL` | Production URL (e.g., `https://tamrakarcomplex.com`) |
| `CPANEL_HOST` | cPanel server hostname |
| `CPANEL_USERNAME` | cPanel SSH username |
| `CPANEL_SSH_KEY` | SSH private key (PEM format) |
| `CPANEL_SSH_PORT` | SSH port (default: 22) |
| `CPANEL_REMOTE_PATH` | Remote path (e.g., `/home/user/tamrakar`) |

## Environments

Configure in **Settings → Environments**:

- `production` — requires approval before deploy (optional but recommended)

## Deployment Flow

1. Push to `main` triggers CI workflow
2. CI runs: type-check → lint → unit tests → route check → migration check → build → chrome smoke check
3. If CI passes, deploy workflow runs:
   - Builds production bundle
   - Runs `prepare-cpanel.cjs` to create deployment package
   - Uploads to cPanel via SFTP
   - Restarts Node app via SSH

## Manual Deploy

```bash
# Build and prepare
npm run build
node scripts/prepare-cpanel.cjs

# Upload cpanel-deploy-ready/ to cPanel via SFTP/FTP
# Then restart the Node app via cPanel UI or SSH
```

## Rollback

1. Revert the commit on `main`: `git revert <sha>`
2. Push — CI will deploy the previous version
3. Or manually upload a previous `cpanel-deploy-ready/` bundle

## Health Check

```
GET /health
→ { "status": "ok", "uptime": 1234, "timestamp": "...", "version": "..." }
```

Use this endpoint for uptime monitoring (UptimeRobot, Checkly, etc.).

## Monitoring Setup

1. **Uptime**: Configure UptimeRobot to poll `https://tamrakarcomplex.com/health` every 5 minutes
2. **Errors**: Add Sentry (see `docs/RUNBOOK.md` → Error Tracking)
3. **Performance**: Lighthouse CI runs on PRs (see `.github/workflows/ci.yml`)

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 502 after deploy | Node app crashed | Check cPanel error logs, verify `npm ci --omit=dev` succeeded |
| Blank page | Missing dist | Verify `npm run build` ran before deploy |
| CSP violations | New external resource | Add domain to CSP in `server.cjs` |
| High latency | No compression | Verify `compression()` middleware active |
