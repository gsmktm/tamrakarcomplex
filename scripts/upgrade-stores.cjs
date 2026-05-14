#!/usr/bin/env node

require("dotenv").config();
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SITE_URL = process.env.SITE_URL || "https://tamrakarcomplex.com";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_ENRICH = String(process.env.GOOGLE_PLACES_ENRICH || "false").toLowerCase() === "true";

const PACKAGE_DEFINITIONS = [
  {
    name: "Free",
    price: 0,
    billing_cycle: "monthly",
    product_limit: 5,
    accessory_limit: 5,
    staff_limit: 0,
    exchange_enabled: true,
    repair_enabled: true,
    custom_seo_enabled: false,
    analytics_level: "none",
    featured_enabled: false,
    verified_badge_enabled: false,
    homepage_promotion_enabled: false,
  },
  {
    name: "Silver",
    price: 0,
    billing_cycle: "monthly",
    product_limit: 25,
    accessory_limit: 25,
    staff_limit: 2,
    exchange_enabled: true,
    repair_enabled: true,
    custom_seo_enabled: true,
    analytics_level: "basic",
    featured_enabled: false,
    verified_badge_enabled: false,
    homepage_promotion_enabled: false,
  },
  {
    name: "Gold",
    price: 0,
    billing_cycle: "monthly",
    product_limit: 100,
    accessory_limit: 100,
    staff_limit: 5,
    exchange_enabled: true,
    repair_enabled: true,
    custom_seo_enabled: true,
    analytics_level: "advanced",
    featured_enabled: true,
    verified_badge_enabled: false,
    homepage_promotion_enabled: false,
  },
  {
    name: "Diamond",
    price: 0,
    billing_cycle: "monthly",
    product_limit: -1,
    accessory_limit: -1,
    staff_limit: -1,
    exchange_enabled: true,
    repair_enabled: true,
    custom_seo_enabled: true,
    analytics_level: "advanced",
    featured_enabled: true,
    verified_badge_enabled: true,
    homepage_promotion_enabled: true,
  },
];

const NULL_PROFILE_FIELDS = [
  "phone",
  "whatsapp",
  "email",
  "location",
  "floor",
  "block",
  "shop_number",
  "logo_url",
  "banner_url",
  "description",
];

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://tvgmnjuexdgtgtqhrjok.supabase.co";

function isUsableKey(value) {
  return Boolean(value && !/your-|placeholder/i.test(value) && value.split(".").length === 3);
}

const supabaseKey = [
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
].find(isUsableKey);

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

function slugify(value) {
  return String(value || "store")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "store";
}

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function defaultSeoTitle(name) {
  return `${name} - Mobile Phones, Repair, Exchange & Accessories in Tamrakar Complex`;
}

function defaultSeoDescription(name) {
  return `Visit ${name} at Tamrakar Complex for mobile phones, accessories, repair service, and phone exchange offers.`;
}

function normalizePackageName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["free", "silver", "gold", "diamond"].includes(normalized)) return normalized;
  return "free";
}

async function fetchAllStores(supabase) {
  const all = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .range(from, from + pageSize - 1)
      .order("created_at", { ascending: true });
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

async function ensurePackages(supabase, report) {
  const packagesByName = new Map();

  for (const definition of PACKAGE_DEFINITIONS) {
    const { data: existing, error: readError } = await supabase
      .from("store_packages")
      .select("*")
      .ilike("name", definition.name)
      .maybeSingle();

    if (readError) throw readError;

    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from("store_packages")
        .insert(definition)
        .select("*")
        .single();
      if (createError) throw createError;
      packagesByName.set(definition.name.toLowerCase(), created);
      report.packages_created += 1;
      continue;
    }

    const patch = {};
    for (const [key, value] of Object.entries(definition)) {
      if (key === "name") continue;
      if (isBlank(existing[key])) patch[key] = value;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from("store_packages")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      packagesByName.set(definition.name.toLowerCase(), updated);
    } else {
      packagesByName.set(definition.name.toLowerCase(), existing);
    }
  }

  return packagesByName;
}

function isMissingStoreOsSchema(error) {
  return /store_packages|seo_slug|package_id|schema cache|Could not find the table/i.test(error?.message || "");
}

function applyStoreOsMigrationIfPossible(report) {
  if (!databaseUrl) {
    report.errors.push({
      error:
        "Store OS schema is not installed and no DATABASE_URL/SUPABASE_DB_URL is configured. Apply supabase/migrations/20260507030000_store_operating_system.sql, or set a direct Postgres URL so this command can apply it.",
    });
    return false;
  }

  const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260507030000_store_operating_system.sql");
  if (!fs.existsSync(migrationPath)) {
    report.errors.push({ error: `Store OS migration file not found at ${migrationPath}` });
    return false;
  }

  try {
    execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", migrationPath], {
      stdio: "pipe",
      env: process.env,
    });
    report.schema_migration_applied = true;
    return true;
  } catch (error) {
    report.errors.push({
      error:
        "Failed to apply Store OS migration automatically. Install psql and verify DATABASE_URL/SUPABASE_DB_URL, or apply the migration manually.",
      detail: error.stderr?.toString() || error.message,
    });
    return false;
  }
}

function buildSlugMap(stores) {
  const used = new Set(stores.map((store) => store.seo_slug).filter(Boolean));
  const assigned = new Map();

  for (const store of stores) {
    if (!isBlank(store.seo_slug)) {
      assigned.set(store.id, store.seo_slug);
      continue;
    }

    const base = slugify(store.slug || store.name || store.id);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    assigned.set(store.id, candidate);
  }

  return assigned;
}

async function googlePlacesEnrich(store, report) {
  if (!GOOGLE_PLACES_ENRICH || !GOOGLE_PLACES_API_KEY) return {};

  const query = [store.name, store.location || store.address || "Tamrakar Complex Kathmandu"].filter(Boolean).join(" ");
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  try {
    const searchResponse = await fetch(searchUrl);
    const searchPayload = await searchResponse.json();
    const place = searchPayload.results?.[0];
    if (!place?.place_id) {
      report.google_skipped += 1;
      return {};
    }

    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailsUrl.searchParams.set("place_id", place.place_id);
    detailsUrl.searchParams.set("fields", "formatted_address,formatted_phone_number,international_phone_number,website,url,opening_hours,name");
    detailsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    const detailsResponse = await fetch(detailsUrl);
    const detailsPayload = await detailsResponse.json();
    const details = detailsPayload.result || {};
    const patch = {};

    if (isBlank(store.location) && details.formatted_address) patch.location = details.formatted_address;
    if (isBlank(store.phone) && (details.formatted_phone_number || details.international_phone_number)) {
      patch.phone = details.formatted_phone_number || details.international_phone_number;
    }
    if (isBlank(store.website) && details.website) patch.website = details.website;
    if (isBlank(store.map_url) && details.url) patch.map_url = details.url;
    if (isBlank(store.opening_hours) && details.opening_hours?.weekday_text) {
      patch.opening_hours = { weekday_text: details.opening_hours.weekday_text };
    }

    if (Object.keys(patch).length > 0) report.google_enriched += 1;
    else report.google_skipped += 1;
    return patch;
  } catch (error) {
    report.errors.push({ store_id: store.id, name: store.name, error: `Google Places enrichment failed: ${error.message}` });
    return {};
  }
}

async function upgradeStore(supabase, store, packagesByName, slugByStoreId, report) {
  const patch = {};
  const slug = slugByStoreId.get(store.id);
  const packageName = normalizePackageName(store.package_slug);
  const selectedPackage = packagesByName.get(packageName) || packagesByName.get("free");
  const name = store.name || "Store";

  if (isBlank(store.seo_slug)) {
    patch.seo_slug = slug;
    report.slugs_generated += 1;
  }
  if (isBlank(store.slug)) patch.slug = slug;
  if (isBlank(store.seo_title)) patch.seo_title = defaultSeoTitle(name);
  if (isBlank(store.seo_description)) patch.seo_description = defaultSeoDescription(name);
  if (isBlank(store.meta_keywords)) patch.meta_keywords = `${name}, Tamrakar Complex, mobile phones, accessories, repair, exchange`;
  if (isBlank(store.canonical_url)) patch.canonical_url = `${SITE_URL.replace(/\/$/, "")}/stores/${isBlank(store.seo_slug) ? slug : store.seo_slug}`;
  if (isBlank(store.package_id) && selectedPackage?.id) patch.package_id = selectedPackage.id;
  if (isBlank(store.package_slug)) patch.package_slug = selectedPackage?.name?.toLowerCase() || "free";
  if (isBlank(store.owner_user_id) && !isBlank(store.owner_id)) patch.owner_user_id = store.owner_id;
  if (isBlank(store.shop_number) && !isBlank(store.shop_no)) patch.shop_number = store.shop_no;
  
  // Try to extract floor from shop_no if floor is blank
  if (isBlank(store.floor) && !isBlank(store.shop_no)) {
    const shopNo = String(store.shop_no);
    if (shopNo.includes("-")) {
      const parts = shopNo.split("-");
      if (parts[0].length === 1 && !isNaN(parseInt(parts[0]))) {
        const floorNum = parseInt(parts[0]);
        const floorMap = ["1st", "2nd", "3rd", "4th", "5th"];
        if (floorNum >= 1 && floorNum <= 5) {
          patch.floor = floorMap[floorNum - 1];
        }
      }
    } else if (shopNo.length >= 3 && !isNaN(parseInt(shopNo[0]))) {
      const firstDigit = parseInt(shopNo[0]);
      const floorMap = ["1st", "2nd", "3rd", "4th", "5th"];
      if (firstDigit >= 1 && firstDigit <= 5) {
        patch.floor = floorMap[firstDigit - 1];
      }
    }
  }
  if (isBlank(store.banner_url) && !isBlank(store.cover_image_url)) patch.banner_url = store.cover_image_url;
  if (isBlank(store.public_status) && String(store.status || "active").toLowerCase() === "active") patch.public_status = "published";
  if (store.public_status !== "published" && String(store.status || "active").toLowerCase() === "active") patch.public_status = "published";

  for (const field of NULL_PROFILE_FIELDS) {
    if (!(field in store) || store[field] === undefined) patch[field] = null;
  }

  Object.assign(patch, await googlePlacesEnrich(store, report));

  if (Object.keys(patch).length === 0) {
    report.skipped_stores += 1;
    return;
  }

  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from("stores").update(patch).eq("id", store.id);
  if (error) throw error;
  report.stores_upgraded += 1;
}

function printReport(report) {
  console.log("\nStore upgrade final report");
  console.log("--------------------------");
  console.log(`total stores found: ${report.total_stores_found}`);
  console.log(`stores upgraded: ${report.stores_upgraded}`);
  console.log(`slugs generated: ${report.slugs_generated}`);
  console.log(`packages created: ${report.packages_created}`);
  console.log(`skipped stores: ${report.skipped_stores}`);
  console.log(`schema migration applied: ${report.schema_migration_applied ? "yes" : "no"}`);
  if (GOOGLE_PLACES_ENRICH) {
    console.log(`google enriched: ${report.google_enriched}`);
    console.log(`google skipped: ${report.google_skipped}`);
  }
  console.log(`errors: ${report.errors.length}`);
  if (report.errors.length > 0) {
    console.log(JSON.stringify(report.errors, null, 2));
  }
}

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report = {
    total_stores_found: 0,
    stores_upgraded: 0,
    slugs_generated: 0,
    packages_created: 0,
    skipped_stores: 0,
    google_enriched: 0,
    google_skipped: 0,
    schema_migration_applied: false,
    abort: false,
    errors: [],
  };

  try {
    let stores = [];
    try {
      stores = await fetchAllStores(supabase);
      report.total_stores_found = stores.length;
    } catch (error) {
      report.errors.push({ error: `Could not read stores table: ${error.message}` });
      report.abort = true;
    }

    let packagesByName;
    try {
      packagesByName = await ensurePackages(supabase, report);
    } catch (error) {
      if (!isMissingStoreOsSchema(error)) throw error;
      const applied = applyStoreOsMigrationIfPossible(report);
      if (!applied) report.abort = true;
      else packagesByName = await ensurePackages(supabase, report);
    }

    if (!report.abort) {
      const slugByStoreId = buildSlugMap(stores);
      for (const store of stores) {
        try {
          await upgradeStore(supabase, store, packagesByName, slugByStoreId, report);
        } catch (error) {
          report.errors.push({ store_id: store.id, name: store.name, error: error.message });
        }
      }
    }
  } catch (error) {
    report.errors.push({ error: error.message });
  } finally {
    printReport(report);
  }

  if (report.errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Store upgrade failed:", error);
  process.exit(1);
});
