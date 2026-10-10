const express = require("express");
const compression = require("compression");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { z } = require("zod");

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");
const INDEX = path.join(DIST, "index.html");

const apiError = (res, status, code, message) => res.status(status).json({
  data: null,
  error: { code, message, requestId: res.locals.requestId },
});

const cleanText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const contactSchema = z.object({
  name: cleanText(120),
  email: z.string().trim().email().max(320),
  subject: optionalText(160),
  message: cleanText(3000),
}).strict();
const repairRequestSchema = z.object({
  name: cleanText(120),
  phone: z.string().trim().regex(/^(?:\+?977)?9[678]\d{8}$/, "Invalid Nepal mobile number"),
  email: z.string().trim().email().max(320).optional().nullable(),
  device_brand: cleanText(80),
  device_model: cleanText(120),
  issue_type: cleanText(80),
  description: optionalText(3000),
  preferred_date: z.string().date().optional().nullable(),
}).strict();

function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      return apiError(res, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
    }
    return next();
  };
}

// Verify dist exists on startup
if (!fs.existsSync(INDEX)) {
  console.error("ERROR: dist/index.html not found. Run 'npm run build' first.");
  process.exit(1);
}

// 1. Compression (before everything)
app.use(compression());
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const incoming = req.get("x-request-id");
  const requestId = incoming && /^[a-zA-Z0-9._-]{8,100}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setTimeout(15000, () => {
    if (!res.headersSent) apiError(res, 503, "REQUEST_TIMEOUT", "The request timed out.");
  });
  next();
});

// 2. Health check (cPanel/monitoring probe) — before auth/security so probes work
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
  });
});

// 3. Constants
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://tvgmnjuexdgtgtqhrjok.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4-Yq_PD4j8sVEsn1ZM1-Mw_ZDPUAd5v";
const BASE_URL = (process.env.SITE_URL || "https://tamrakarcomplex.com").replace(/\/$/, "");
const SUPABASE_REQUEST_TIMEOUT_MS = 5000;

// 4. Security headers (applied to ALL responses)
app.use((req, res, next) => {
  const supabaseHost = new URL(SUPABASE_URL).hostname;

  // Content Security Policy — strict but compatible with the SPA's resource graph
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://*.supabase.co wss://*.supabase.co https://*.supabase.in`,
    "media-src 'self' https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.supabase.co https://*.esewa.com https://*.khalti.com",
    "form-action 'self' https://*.esewa.com https://*.khalti.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

const STATIC_URLS = [
  { loc: "/",                  changefreq: "daily",  priority: "1.0" },
  { loc: "/cat/mobiles",       changefreq: "daily",  priority: "0.9" },
  { loc: "/stores",            changefreq: "daily",  priority: "0.8" },
  { loc: "/marketplace",       changefreq: "hourly", priority: "0.8" },
  { loc: "/sell-your-phone",   changefreq: "weekly", priority: "0.8" },
  { loc: "/repair",            changefreq: "weekly", priority: "0.8" },
  { loc: "/stores/article",    changefreq: "daily",  priority: "0.7" },
  { loc: "/compare",           changefreq: "weekly", priority: "0.6" },
  { loc: "/guides",            changefreq: "weekly", priority: "0.6" },
  { loc: "/brands",            changefreq: "weekly", priority: "0.6" },
  { loc: "/about-us",          changefreq: "monthly", priority: "0.6" },
  { loc: "/contact-us",        changefreq: "monthly", priority: "0.6" },
  { loc: "/shipping-delivery", changefreq: "monthly", priority: "0.6" },
  { loc: "/returns-refunds",   changefreq: "monthly", priority: "0.6" },
  { loc: "/marketplace-disclosure", changefreq: "monthly", priority: "0.6" },
  { loc: "/privacy-policy",    changefreq: "yearly", priority: "0.4" },
  { loc: "/terms-of-service",  changefreq: "yearly", priority: "0.4" },
];

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function supabaseFetch(table, select, filters) {
  const https = require("https");
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  if (filters) url += `&${filters}`;
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
        "Accept-Profile": "public",
      },
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return resolve([]);
        try { resolve(JSON.parse(raw)); } catch { resolve([]); }
      });
    });
    req.setTimeout(SUPABASE_REQUEST_TIMEOUT_MS, () => req.destroy(new Error("Supabase request timed out")));
    req.on("error", () => resolve([]));
  });
}

async function supabaseRpcPage(functionName, from = 0, to = 999) {
  const https = require("https");
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public",
        "Range-Unit": "items",
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      },
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch {
          resolve([]);
        }
      });
    });
    req.setTimeout(SUPABASE_REQUEST_TIMEOUT_MS, () => req.destroy(new Error("Supabase RPC timed out")));
    req.on("error", () => resolve([]));
    req.write("{}");
    req.end();
  });
}

async function supabaseRpc(functionName) {
  const pageSize = 1000;
  const rows = [];
  const seen = new Set();
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const page = await supabaseRpcPage(functionName, offset, offset + pageSize - 1);
    if (!page.length) break;
    const before = rows.length;
    for (const row of page) {
      const key = row?.loc || JSON.stringify(row);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
    if (rows.length === before) break;
    if (page.length < pageSize) break;
  }
  return rows;
}

function urlEntry(loc, changefreq, priority, lastmod) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
  return `  <url><loc>${BASE_URL}${loc}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

let sitemapCache = null;
let sitemapCachedAt = 0;
const SITEMAP_TTL_MS = 60 * 60 * 1000; // 1 hour

app.get("/sitemap.xml", async (req, res) => {
  const now = Date.now();
  if (sitemapCache && now - sitemapCachedAt < SITEMAP_TTL_MS) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(sitemapCache);
  }

  try {
    const rpcRows = await supabaseRpc("generate_seo_sitemap");
    if (rpcRows.length > 0) {
      const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...rpcRows.map((row) => {
          const loc = String(row.loc || "").startsWith("http") ? row.loc : `${BASE_URL}${row.loc || "/"}`;
          const lastmodTag = row.lastmod ? `<lastmod>${String(row.lastmod).slice(0, 10)}</lastmod>` : "";
          const changefreq = row.changefreq || "weekly";
          const priority = Number(row.priority || 0.5).toFixed(1);
          return `  <url><loc>${loc}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
        }),
        "</urlset>",
      ];
      sitemapCache = lines.join("\n");
      sitemapCachedAt = now;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(sitemapCache);
    }

    const [products, devices, articles, guides, stores] = await Promise.all([
      supabaseFetch("products", "slug,updated_at", "in_stock=eq.true&order=updated_at.desc&limit=2000"),
      supabaseFetch("device_catalog", "canonical_slug,brand,updated_at", "order=updated_at.desc&limit=2000"),
      supabaseFetch("articles", "slug,updated_at", "published=eq.true&order=updated_at.desc&limit=500"),
      supabaseFetch("guides", "slug,updated_at", "is_published=eq.true&order=updated_at.desc&limit=500"),
      supabaseFetch("stores", "slug,updated_at", "is_active=eq.true&order=updated_at.desc&limit=500"),
    ]);

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...STATIC_URLS.map((u) => urlEntry(u.loc, u.changefreq, u.priority, null)),
    ];

    // Products — /product/:slug
    for (const p of Array.isArray(products) ? products : []) {
      if (p.slug) lines.push(urlEntry(`/product/${p.slug}`, "weekly", "0.8", p.updated_at));
    }

    // Device catalog — /cat/mobiles/:brand/:slug
    for (const d of Array.isArray(devices) ? devices : []) {
      if (d.canonical_slug && d.brand) {
        const brand = d.brand.toLowerCase().replace(/\s+/g, "-");
        lines.push(urlEntry(`/cat/mobiles/${brand}/${d.canonical_slug}`, "daily", "0.7", d.updated_at));
      }
    }

    // Articles — /stores/article/:slug
    for (const a of Array.isArray(articles) ? articles : []) {
      if (a.slug) lines.push(urlEntry(`/stores/article/${a.slug}`, "monthly", "0.6", a.updated_at));
    }

    // Guides — /guides/:slug
    for (const g of Array.isArray(guides) ? guides : []) {
      if (g.slug) lines.push(urlEntry(`/guides/${g.slug}`, "monthly", "0.5", g.updated_at));
    }

    // Store pages — /stores/:slug
    for (const s of Array.isArray(stores) ? stores : []) {
      if (s.slug) lines.push(urlEntry(`/stores/${s.slug}`, "weekly", "0.7", s.updated_at));
    }

    lines.push("</urlset>");
    const xml = lines.join("\n");

    sitemapCache = xml;
    sitemapCachedAt = now;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    console.error("[sitemap] error:", err.message);
    // Fallback to static sitemap
    res.sendFile(path.join(DIST, "sitemap.xml"));
  }
});

app.get("/merchant-center.xml", async (req, res) => {
  const products = await supabaseFetch(
    "products",
    "id,slug,name,description,brand,image,price_value,in_stock",
    "in_stock=eq.true&price_value=gt.0&image=not.is.null&slug=not.is.null&order=updated_at.desc&limit=5000",
  );
  const items = (Array.isArray(products) ? products : [])
    .filter((p) => p.id && p.slug && p.name && p.image && Number(p.price_value) > 0)
    .map((p) => `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || `${p.name} available from Tamrakar Complex`)}</g:description>
      <g:link>${BASE_URL}/product/${encodeURIComponent(p.slug)}</g:link>
      <g:image_link>${escapeXml(p.image)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${Number(p.price_value).toFixed(2)} NPR</g:price>
      <g:condition>new</g:condition>
      ${p.brand ? `<g:brand>${escapeXml(p.brand)}</g:brand>` : "<g:identifier_exists>no</g:identifier_exists>"}
    </item>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Tamrakar Complex purchasable products</title>
    <link>${BASE_URL}</link>
    <description>Current in-stock products with direct checkout</description>
${items.join("\n")}
  </channel>
</rss>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=900");
  res.send(xml);
});

// 4. API Routes — server-side proxy for sensitive operations
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// API: Contact form submission (proxied to Supabase to avoid exposing anon key)
app.post("/api/contact", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) return apiError(res, 422, "INVALID_CONTACT", parsed.error.issues[0].message);
    const { name, email, subject, message } = parsed.data;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/contact_messages`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ name, email, subject: subject || null, message }),
      }
    );
    if (!response.ok) {
      return apiError(res, 502, "CONTACT_SUBMISSION_FAILED", "Failed to submit contact form.");
    }
    res.status(201).json({ data: { success: true }, error: null });
  } catch {
    apiError(res, 500, "INTERNAL_ERROR", "Internal server error.");
  }
});

// API: Order creation (proxied to Supabase RPC for atomicity)
app.post("/api/orders", async (req, res) => {
  return apiError(
    res,
    410,
    "LEGACY_ORDER_ENDPOINT_DISABLED",
    "Use the authenticated secure checkout service.",
  );
});

// API: Repair request submission (proxied to Supabase)
app.post("/api/repair-requests", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 4 }), async (req, res) => {
  try {
    const parsed = repairRequestSchema.safeParse(req.body);
    if (!parsed.success) return apiError(res, 422, "INVALID_REPAIR_REQUEST", parsed.error.issues[0].message);
    const { name, phone, email, device_brand, device_model, issue_type, description, preferred_date } = parsed.data;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/repair_requests`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name,
          phone,
          email: email || null,
          device_brand,
          device_model,
          issue_type,
          description: description || null,
          preferred_date: preferred_date || null,
          status: "new",
        }),
      }
    );
    if (!response.ok) {
      return apiError(res, 502, "REPAIR_SUBMISSION_FAILED", "Failed to submit repair request.");
    }
    res.status(201).json({ data: { success: true }, error: null });
  } catch {
    apiError(res, 500, "INTERNAL_ERROR", "Internal server error.");
  }
});

// API: Wishlist toggle (proxied to Supabase)
app.post("/api/wishlist", async (req, res) => {
  return apiError(
    res,
    410,
    "LEGACY_WISHLIST_ENDPOINT_DISABLED",
    "Use the authenticated RLS-protected wishlist service.",
  );
});

app.use("/api", (req, res) => apiError(res, 404, "API_NOT_FOUND", "API route not found."));

// API error handler middleware
app.use((err, req, res, next) => {
  console.error(`[API Error] requestId=${res.locals.requestId} ${req.method} ${req.path}:`, err.message);
  apiError(res, 500, "INTERNAL_ERROR", "Internal server error.");
});

// 5. Static assets — 1-year cache for hashed files, no-cache for index.html
app.use(
  express.static(DIST, {
    maxAge: "1y",
    etag: true,
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  })
);

// 5. SPA fallback — all unmatched routes → index.html
app.get("*", (req, res) => {
  res.sendFile(INDEX);
});

// 6. Listen
app.listen(PORT, () => {
  console.log(`[tamrakar] NODE_ENV=${process.env.NODE_ENV || "production"} port=${PORT}`);
});
