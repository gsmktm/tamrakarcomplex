# Security Policy

## Security Headers

All responses include strict security headers (see `server.cjs`):

| Header | Value | Purpose |
|---|---|---|
| Content-Security-Policy | strict, nonce-free | XSS prevention |
| Strict-Transport-Security | 2yr, includeSubDomains | HTTPS enforcement |
| X-Content-Type-Options | nosniff | MIME sniffing prevention |
| X-Frame-Options | SAMEORIGIN | Clickjacking prevention |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer control |
| Permissions-Policy | camera/mic/geo=() | Feature restriction |
| Cross-Origin-Opener-Policy | same-origin | Spectre mitigation |

## CSP Directives

```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' https://fonts.gstatic.com
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in
frame-src 'self' https://*.supabase.co https://*.esewa.com https://*.khalti.com
form-action 'self' https://*.esewa.com https://*.khalti.com
```

If you add a new external resource (CDN, API, widget), update the CSP in `server.cjs`.

## Secrets Management

- **Never** commit `.env` files — they're in `.gitignore`
- Production secrets live in:
  - cPanel environment variables (runtime)
  - GitHub Actions secrets (CI/CD)
  - Supabase Edge Function secrets (functions)
- Rotate keys immediately if exposed

## Nepal Data Protection

- Payment data (eSewa, Khalti) is handled by the gateways — we never store card numbers
- PII (names, emails, phone numbers) is stored in Supabase PostgreSQL with RLS
- Contact messages and repair requests are server-side validated (zod) and rate-limited
- No user tracking beyond Supabase Auth sessions

## Dependency Scanning

- `npm audit` runs weekly in CI (see `.github/workflows/security.yml`)
- Critical/high vulnerabilities block the pipeline
- TruffleHog scans for committed secrets on every push
- CodeQL performs static analysis

## Rate Limiting

- Contact form: 5 requests/hour/IP
- Repair requests: 4 requests/hour/IP
- API routes: 15s timeout

## Reporting

Report security vulnerabilities to: security@tamrakarcomplex.com
