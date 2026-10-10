# Operations Runbook

## Quick Reference

| Action | Command / URL |
|---|---|
| Deploy | Push to `main` (auto) or `workflow_dispatch` |
| View logs | cPanel → Error Logs, or SSH: `~/logs/` |
| Restart app | cPanel → Node.js → Restart, or SSH: `pm2 restart tamrakar` |
| Health check | `curl https://tamrakarcomplex.com/health` |
| Rollback | `git revert <sha>` + push |

## Incident Response

### Site Down (5xx / timeout)

1. **Check health endpoint**: `curl -s https://tamrakarcomplex.com/health`
   - If 200: likely a frontend issue (check browser console / Sentry)
   - If 5xx/timeout: infrastructure issue
2. **Check cPanel Node.js app status**: cPanel → Node.js → Status
3. **View logs**: `~/logs/node_app_error.log` or cPanel → Errors
4. **Common fixes**:
   - App crashed → Restart via cPanel
   - Deploy failed → Re-run deploy workflow or manual deploy
   - Disk full → Remove old `cpanel-deploy-ready-*` bundles
   - Port conflict → Verify PORT env var

### High Error Rate

1. Check Sentry dashboard for error trends
2. If Supabase-related:
   - Check Supabase Dashboard → Database → Status
   - Check Edge Functions logs
3. If payment-related (eSewa/Khalti):
   - Verify credentials in Supabase Edge Function secrets
   - Check payment gateway status pages

### CSP / Security Violations

1. Check browser console for CSP violation reports
2. Identify the blocked resource
3. Add the domain to the appropriate CSP directive in `server.cjs`
4. Redeploy

### Database Issues

1. Supabase handles backups automatically (7-day PITR on Pro)
2. To restore: Supabase Dashboard → Database → Backups
3. For migration issues: `supabase db reset` (dev only)

## Scheduled Tasks

| Task | Frequency | How |
|---|---|---|
| Dependency audit | Monday 6am UTC | GitHub Actions (`security.yml`) |
| Supabase backup | Daily (auto) | Supabase managed |
| SSL cert renewal | Auto | cPanel / Let's Encrypt |
| Log review | Weekly | Check cPanel error logs |

## Error Tracking Setup (Sentry)

1. Create Sentry account at https://sentry.io
2. Create a new project (React)
3. Copy the DSN
4. Add GitHub secret: `SENTRY_DSN`
5. Add to `.env.production`: `VITE_SENTRY_DSN=your-dsn`
6. Install: `npm install @sentry/react @sentry/vite-plugin`
7. Initialize in `main.tsx`:

```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

## Performance Monitoring

- Lighthouse CI runs on every PR
- Manual audit: Chrome DevTools → Lighthouse
- Core Web Vitals: Search Console → Core Web Vitals report

## Security Contacts

- Report security issues to: security@tamrakarcomplex.com
- Supabase security: https://supabase.com/security
- cPanel security: hosting provider support
