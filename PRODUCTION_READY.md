# Production Ready Configuration - Tamrakar Platform
# Last Updated: May 5, 2026

## Environment Configuration ✅

### Current Status
- [x] .env configured for development
- [x] .env.production created with template
- [x] NODE_ENV configuration fixed (Vite limitation)
- [x] Production build completes successfully
- [x] All tests passing (41/41)

### Production Environment Setup

**File:** `.env.production`

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Production Feature Flags
VITE_ESEWA_ENABLED=true
VITE_REQUIRE_SUBSCRIPTION=true

# Payment Gateway
ESEWA_MERCHANT_ID=your-merchant-id
ESEWA_SECRET_KEY=your-secret-key

# URLs
SITE_URL=https://tamrakarcomplex.com
ALLOWED_ORIGINS=https://tamrakarcomplex.com

# Server (when using Node.js hosting)
PORT=3000
```

---

## Build Status ✅

### Production Build Output

```
✓ 3698 modules transformed
✓ Built successfully in 1m 28s

Build Size Analysis:
- Gzipped CSS: 27.28 kB (excellent)
- Main JS Bundle: 290.53 kB (after gzip) ⚠️
- Total Dist: ~1.6 MB uncompressed

Note: Large Analytics chunk (438 kB uncompressed) can be optimized
via code-splitting if needed for Core Web Vitals improvement.
```

### Code Quality Status

- ✅ TypeScript: No compilation errors
- ✅ Tests: All 41 tests passing
- ✅ Build: No errors or critical warnings
- ⚠️  Lint: 179 warnings (mostly `any` types) - non-blocking

---

## Deployment Options

### Option 1: Vercel (Recommended - ⭐ Fastest)

**Setup Time:** 5-10 minutes
**Complexity:** Minimal
**Cost:** Free tier or paid

**Steps:**
```bash
# 1. Push code to GitHub
git add .
git commit -m "chore: convert to production"
git push origin main

# 2. Go to vercel.com
# - Add New Project
# - Select GitHub repo
# - Framework: Vite (auto-detected)

# 3. Set Environment Variables:
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_PUBLISHABLE_KEY
#    - VITE_ESEWA_ENABLED=true
#    - VITE_REQUIRE_SUBSCRIPTION=true

# 4. Deploy (automatic on push)
```

**Advantages:**
- Zero-config SPA routing (vercel.json already configured)
- Automatic HTTPS
- Global CDN
- Serverless functions (if needed)

**URLs:**
- Production: https://tamrakar-main.vercel.app (or custom domain)
- Deployments: Automatic on main branch push

---

### Option 2: Netlify

**Setup Time:** 5-10 minutes
**Complexity:** Minimal
**Cost:** Free tier or paid

**Steps:**
```bash
# 1. Push code to GitHub (same as Vercel)

# 2. Go to netlify.com
# - Add new site
# - Import existing project
# - Select GitHub repo

# 3. Configure:
#    Build command: npm run build
#    Publish directory: dist

# 4. Set same environment variables as Vercel

# 5. Deploy (automatic on push)
```

**Advantages:**
- Zero-config SPA routing (netlify.toml already configured)
- Automatic HTTPS
- Edge functions available
- Form handling built-in

**URLs:**
- Production: https://tamrakar-main.netlify.app (or custom domain)
- Deployments: Automatic on main branch push

---

### Option 3: Self-Hosted (Node.js)

**Setup Time:** 30-60 minutes
**Complexity:** Moderate
**Cost:** Server hosting cost only

**Prerequisites:**
- Linux server (Ubuntu recommended)
- Node.js 20.20.0+
- Nginx or Apache
- SSL certificate (Let's Encrypt free)

**Setup Steps:**

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/your-org/tamrakar.git
cd tamrakar

# 3. Install dependencies
npm ci --production

# 4. Create production environment
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_ESEWA_ENABLED=true
VITE_REQUIRE_SUBSCRIPTION=true
ESEWA_MERCHANT_ID=your-merchant-id
ESEWA_SECRET_KEY=your-secret-key
SITE_URL=https://tamrakarcomplex.com
ALLOWED_ORIGINS=https://tamrakarcomplex.com
PORT=3000
EOF

# 5. Build frontend
npm run build

# 6. Start server
NODE_ENV=production npm start
# Or use PM2 for persistence:
pm2 start "npm start" --name "tamrakar"
```

**Nginx Reverse Proxy Configuration:**

```nginx
# /etc/nginx/sites-available/tamrakar

upstream tamrakar {
    server localhost:3000;
}

server {
    listen 80;
    server_name tamrakarcomplex.com www.tamrakarcomplex.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tamrakarcomplex.com www.tamrakarcomplex.com;

    ssl_certificate /etc/letsencrypt/live/tamrakarcomplex.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tamrakarcomplex.com/privkey.pem;

    # Performance optimizations
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;

    location / {
        proxy_pass http://tamrakar;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Disable caching for HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }
}
```

**Enable HTTPS with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d tamrakarcomplex.com -d www.tamrakarcomplex.com
```

**Enable and start Nginx:**
```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl restart nginx
```

---

## Verification Checklist ✅

### Pre-Deployment (Complete Before Deploy)

- [x] Production build completes without errors
- [x] All 41 tests passing
- [x] TypeScript compilation successful
- [x] Environment variables template created
- [x] Deployment scripts created
- [ ] Update production Supabase secrets
- [ ] Verify SSL certificate (self-hosted)
- [ ] Test payment gateway with sandbox credentials first

### Post-Deployment (Test After Deploy)

**Functional Testing:**
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Store directory displays
- [ ] Product search functions
- [ ] Store detail page loads
- [ ] Marketplace browsing works
- [ ] Product detail pages load
- [ ] Repair request form works
- [ ] Checkout initiates payment
- [ ] User profile accessible
- [ ] Admin dashboards accessible

**Performance Testing:**
- [ ] Page load time < 3 seconds
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1

**Security Testing:**
- [ ] HTTPS enforced (all traffic redirects)
- [ ] Security headers configured
- [ ] No sensitive data in frontend
- [ ] API rate limiting working
- [ ] CORS properly configured

**Database & External Services:**
- [ ] Supabase connection working
- [ ] Database queries responding normally
- [ ] Storage buckets accessible
- [ ] Edge functions deployed
- [ ] Payment gateway connectivity

---

## Known Issues & Resolutions

### Issue 1: Large Bundle Size
**Status:** ⚠️ Non-blocking
**Solution Options:**
1. Implement dynamic imports for heavy modules
2. Use code-splitting for Analytics chunk (438 kB)
3. Defer non-critical JS loading

### Issue 2: Lint Warnings
**Status:** ℹ️ Optional
**Action:** Fix `any` types over time for code quality

### Issue 3: Browserslist Data Outdated (Vite Warning)
**Status:** ✅ Fixed in build config
**Impact:** Minimal (affects browser support detection only)

---

## Monitoring & Maintenance

### Weekly Tasks
```bash
# Check for security updates
npm audit

# Review error logs
# (Configure in your deployment platform)

# Monitor database performance
# (Check Supabase dashboard)
```

### Monthly Tasks
- Review Core Web Vitals scores
- Analyze user feedback
- Performance optimization review
- Security audit

### Quarterly Tasks
- Major dependency updates
- Code refactoring
- Database optimization
- Capacity planning

---

## Rollback Plan

**If critical issues occur in production:**

```bash
# 1. Immediately revert the deployment

# Vercel/Netlify:
# - Go to Deployments tab
# - Click "Promote" on previous stable version

# Self-hosted:
git revert HEAD
NODE_ENV=production npm start

# 2. Investigate the issue locally
npm run dev

# 3. Test thoroughly before re-deploying
npm test
npm run build

# 4. Re-deploy only after verification
```

---

## Support Resources

**Documentation:**
- [Vite Docs](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

**Deployment Platforms:**
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)

**Payment Gateway:**
- [eSewa Integration Guide](https://developer.esewa.com.np/)

**Monitoring:**
- Set up error tracking (Sentry, LogRocket)
- Enable analytics (Google Analytics, Mixpanel)
- Configure uptime monitoring (UptimeRobot, Pingdom)

---

**Last Deployment:** TBD  
**Deployed By:** TBD  
**Production URL:** https://tamrakarcomplex.com  
**Status:** ✅ Ready for Production
