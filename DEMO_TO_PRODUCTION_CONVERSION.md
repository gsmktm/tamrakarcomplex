# 🚀 Tamrakar Demo to Production Conversion Guide

## Overview
This guide converts the Tamrakar application from demo/development mode to production deployment.

---

## Phase 1: Environment Configuration

### Step 1.1: Configure Production Environment

**Copy the production environment template:**
```bash
cp .env.production .env
```

**Update `.env` with your production values:**

```env
# Supabase Production Project
VITE_SUPABASE_URL=https://your-production-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-anon-key

# Enable Production Features
VITE_ESEWA_ENABLED=true          # Enable payment processing
VITE_REQUIRE_SUBSCRIPTION=true   # Enforce subscription gating

# eSewa Payment Gateway
ESEWA_MERCHANT_ID=your-merchant-id
ESEWA_SECRET_KEY=your-secret-key

# URLs and CORS
SITE_URL=https://tamrakarcomplex.com
ALLOWED_ORIGINS=https://tamrakarcomplex.com

# Server Configuration
NODE_ENV=production
PORT=3000
```

### Step 1.2: Verify Node.js Version
```bash
node --version
# Required: >= 20.20.0
```

---

## Phase 2: Database Setup (Supabase)

### Step 2.1: Run Database Migrations

```bash
# Link your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations (162 migration files)
supabase db push
```

### Step 2.2: Apply Fix Patches (Manual)

Run these SQL files **in order** in Supabase Dashboard → SQL Editor:

1. **fix_app_settings_policy.sql** - Fix app_settings write access for suadmin
```bash
cat fix_app_settings_policy.sql | pbcopy  # Copy to clipboard
```

2. **fix_products_policy.sql** - Fix products RLS for suadmin
3. **fix_repairs_policy.sql** - Fix repair_requests RLS
4. **fix_stores_policy.sql** - Fix stores RLS for suadmin
5. **fix_suadmin.sql** - Create suadmin@tamrakarcomplex.com account

### Step 2.3: Verify Storage Buckets

Confirm these buckets exist in Supabase Dashboard → Storage:
- ✓ `product-images`
- ✓ `store-assets`
- ✓ `repair-guide-images`
- ✓ `user-avatars`
- ✓ `article-images`

If missing, run migration: `20260430014000_add_storage_buckets.sql`

### Step 2.4: Configure Supabase Edge Functions Secrets

In Supabase Dashboard → Project → Edge Functions → Secrets, add:

| Secret | Value | Used By |
|--------|-------|---------|
| ESEWA_MERCHANT_ID | Your eSewa merchant ID | create-payment-session |
| ESEWA_SECRET_KEY | Your eSewa secret key | create-payment-session |
| SITE_URL | https://tamrakarcomplex.com | create-payment-session |
| SUPABASE_SERVICE_ROLE_KEY | Your service role key | valuation-estimator, bootstrap-admin |
| ALLOWED_ORIGINS | https://tamrakarcomplex.com | All functions (CORS) |

**Deploy Edge Functions:**
```bash
supabase functions deploy create-payment-session
supabase functions deploy valuation-estimator
supabase functions deploy import-gadgetbyte-articles
supabase functions deploy import-gadgetbyte-products
supabase functions deploy verify-payment
supabase functions deploy newsletter-subscribe
supabase functions deploy sitemap
```

---

## Phase 3: Code and Configuration Fixes

### Step 3.1: Build and Test

```bash
# Install dependencies (clean install)
npm ci

# Run tests
npm test

# Build for production
npm run build

# Verify build output exists
ls -la dist/
```

### Step 3.2: TypeScript & Lint Issues

**Current status:**
- ✅ TypeScript compilation: Clean
- ✅ Tests: All passing (41/41)
- ⚠️  Lint warnings: 179 issues (mostly `any` types)

**Optional: Fix lint issues**
```bash
npm run lint
# Review and fix TypeScript `any` type warnings for code quality
```

---

## Phase 4: Deployment

### Option A: Vercel (Recommended - Fastest)

```bash
# 1. Push code to GitHub
git add .
git commit -m "chore: convert to production"
git push origin main

# 2. Go to vercel.com → Add New Project → Select repo

# 3. Configure Environment Variables in Vercel:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
# VITE_ESEWA_ENABLED=true
# VITE_REQUIRE_SUBSCRIPTION=true

# 4. Deploy (Vercel handles SPA routing automatically via vercel.json)
```

### Option B: Netlify

```bash
# Same GitHub setup as Vercel

# 1. Go to netlify.com → Add new site → Import existing project
# 2. Build command: npm run build
# 3. Publish directory: dist
# 4. Add environment variables
# 5. Deploy (Netlify handles SPA routing automatically via netlify.toml)
```

### Option C: Self-Hosted (cPanel / Node.js Server)

```bash
# 1. SSH into your server
ssh user@your-server.com

# 2. Set production environment
export NODE_ENV=production
export PORT=3000

# 3. Install dependencies
npm ci --production

# 4. Build the frontend
npm run build

# 5. Start the server
npm start

# 6. (Optional) Use PM2 to keep server running
npm install -g pm2
pm2 start "npm start" --name "tamrakar"
pm2 startup
pm2 save
```

**Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Phase 5: Post-Deployment Verification

### ✅ Functional Testing Checklist

- [ ] Homepage loads correctly
- [ ] User registration and login work
- [ ] Store directory displays properly
- [ ] Marketplace listings appear
- [ ] Search functionality works
- [ ] Price listings display correctly
- [ ] Repair quotes function
- [ ] eSewa payment checkout completes
- [ ] Admin dashboard accessible
- [ ] User profiles functional

### ✅ Performance Verification

- [ ] Page load times < 3 seconds
- [ ] Core Web Vitals scores acceptable
- [ ] Server response times < 1 second
- [ ] Database queries optimized

### ✅ Security Verification

- [ ] HTTPS enabled on all domains
- [ ] Security headers configured
- [ ] Admin routes properly protected
- [ ] API endpoints secured with RLS
- [ ] No sensitive data exposed in frontend
- [ ] SSL certificate valid

### ✅ Monitoring Setup

```bash
# Enable application monitoring
# Set up error tracking (e.g., Sentry)
# Configure performance monitoring
# Set up uptime monitoring
```

---

## Phase 6: Ongoing Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Verify payment processing

### Weekly
- [ ] Review security alerts
- [ ] Update dependencies (security patches only)
- [ ] Analyze user feedback

### Monthly
- [ ] Database optimization
- [ ] Review scaling needs
- [ ] Performance analysis

---

## Rollback Plan

If issues arise:

```bash
# 1. Revert to previous deployment
git revert HEAD
git push origin main

# 2. Redeploy previous version through your platform
# (Vercel/Netlify/Server)

# 3. Investigate issues in development environment
# before attempting re-deployment
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Payment gateway not working**
- Verify ESEWA_MERCHANT_ID and ESEWA_SECRET_KEY in Supabase Edge Functions → Secrets
- Confirm SITE_URL matches your domain
- Test with eSewa sandbox first

**Issue: User authentication fails**
- Check Supabase project is properly configured
- Verify authentication providers are enabled
- Check RLS policies are applied correctly

**Issue: Performance is slow**
- Monitor database query times in Supabase dashboard
- Enable query result caching
- Consider CDN for static assets
- Review Vercel/Netlify deployment logs

**Issue: Database migration failed**
- Check migration file syntax
- Verify Supabase project connectivity
- Run migrations individually to identify failing file

---

## Deployment Checklist

Before marking deployment complete:

- [ ] Phase 1: Environment configured (production .env)
- [ ] Phase 2: Database migrations applied
- [ ] Phase 2: All 5 fix patches applied
- [ ] Phase 2: Edge functions deployed
- [ ] Phase 2: Storage buckets verified
- [ ] Phase 3: Build successful, tests passing
- [ ] Phase 4: Deployed to production platform
- [ ] Phase 5: All functional tests passing
- [ ] Phase 5: Performance verified
- [ ] Phase 5: Security verified
- [ ] Phase 6: Monitoring configured

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Production URL:** https://tamrakarcomplex.com
