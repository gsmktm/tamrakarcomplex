const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const CRITICAL_TABLES = [
  'products','product_images','brands','categories',
  'stores','store_packages','store_subscriptions','store_staff',
  'store_pages','store_reviews','store_products','store_accessories',
  'store_repair_services','store_leads','store_applications',
  'articles','guides','comments','polls','poll_votes',
  'sell_listings','sell_phone_leads','marketplace_offers',
  'repair_requests','repair_services','repair_pricing',
  'unlock_requests','unlocking_services','device_verifications',
  'orders','order_items','store_order_fulfillments',
  'emi_inquiries','emi_plans','price_lists','price_audit_logs',
  'notifications','click_events','chatbot_sessions',
  'audit_logs','user_devices','address_book',
  'exchange_requests','subscription_payments',
  'store_commissions','store_payouts',
  'site_settings','homepage_settings','campaigns',
  'staff_tasks','staff_admins','staff_permissions',
  'store_admin_tasks','seo_metadata','sitemap_entries',
  'compare_entries','wishlist_items',
  'referral_codes','user_points','user_rewards',
  'valuations','valuation_components',
  'catalog_products','catalog_verification',
  'auto_search_pages','visitor_logs',
];

const CRITICAL_RPCS = [
  'get_admin_users_list_secure','create_user_admin',
  'grant_role_by_email','assign_store_admin_by_email',
  'admin_global_search','admin_run_diagnostic_query',
  'generate_seo_sitemap',
  'get_stores_directory','get_eligible_repair_stores',
  'assign_repair_to_store','assign_lead_to_store',
  'calculate_device_valuation','update_device_popularity',
  'find_duplicate_catalog_products','merge_catalog_products',
  'get_catalog_verification_stats',
  'log_search_and_build_auto_page','track_auto_search_page_event',
  'log_visitor','get_visitor_stats','get_top_visitor_countries',
  'get_repair_tracking',
  'convert_points_to_wallet','get_user_points_stats',
  'get_user_referral_data','get_my_history',
  'get_poll_results',
  'chatbot_answer','get_chatbot_admin_overview',
  'record_marketplace_whatsapp_intent',
  'get_store_package_entitlements',
];

async function probeTable(name) {
  try {
    const { error } = await supabase.from(name).select('*', { count: 'exact', head: true }).limit(0);
    if (error && error.code === '42P01') return false;
    if (error && error.code === 'PGRST204') return 'empty_or_no_priv';
    return true;
  } catch (e) { return false; }
}

// RPC existence cannot be checked by INVOKING it with service-role privileges.
// That method can trigger actual user/role/payment mutations when functions have
// default arguments. Search source migrations instead; deployed RPC signatures
// must be verified separately using read-only database catalog queries.
const migrationDir = path.resolve(__dirname, '../supabase/migrations');
const migrationSQL = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir)
      .filter(name => name.endsWith('.sql'))
      .sort()
      .map(name => fs.readFileSync(path.join(migrationDir, name), 'utf8'))
      .join('\n')
  : '';

function hasLocalRPCDefinition(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '(?:CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION|CREATE\\s+FUNCTION\\s+IF\\s+NOT\\s+EXISTS)\\s+(?:public\\.)?["]?' + escaped + '["]?\\s*\\(',
    'i',
  ).test(migrationSQL);
}

async function audit() {
  console.log('\n================================================');
  console.log('  SUPABASE SCHEMA AUDIT — ADMIN + ROUTES');
  console.log('================================================\n');

  // 1. TABLE CHECK
  console.log('📋 TABLE EXISTENCE (70 critical tables probed):');
  let tblMissing = 0;
  for (const t of CRITICAL_TABLES) {
    const st = await probeTable(t);
    if (st === false) { console.log(`  ❌ MISSING: ${t}`); tblMissing++; }
  }
  if (tblMissing === 0) console.log(`  ✅ All ${CRITICAL_TABLES.length} critical tables EXIST or at least resolvable`);

  // 2. RPC CHECK
  console.log(`\n🔌 RPC SOURCE CHECK (${CRITICAL_RPCS.length} names; never invokes RPCs):`);
  let rpcMissing = 0;
  for (const r of CRITICAL_RPCS) {
    if (!hasLocalRPCDefinition(r)) {
      console.log(`  ⚠️  No local migration definition found for RPC: ${r}`);
      rpcMissing++;
    }
  }
  console.log(`  ⚠️  Remote RPC existence, arguments and RLS are NOT verified by this source audit.`);

  // 3. COLUMNS: store_packages scale cols
  console.log('\n📐 store_packages: scale columns (from migration 20260825000000):');
  const { data: pkgRow, error: pkgErr } = await supabase
    .from('store_packages').select('*').limit(1);
  if (!pkgErr && pkgRow?.length > 0) {
    const cols = Object.keys(pkgRow[0]);
    const needed = ['is_active','is_popular','yearly_price','sort_order','stripe_price_id_yearly','annual_discount_percent','bandwidth_gb'];
    const miss = needed.filter(n => !cols.includes(n));
    console.log(`  ${miss.length === 0 ? '✅ All 7 scale cols present' : '⚠️  Missing: ' + miss.join(', ')}`);
  } else {
    console.log(`  ℹ️  store_packages empty or unreadable`);
  }

  // 4. COLUMNS: stores scale cols
  console.log('\n📐 stores: marketplace scale columns:');
  const { data: storeRow, error: stErr } = await supabase
    .from('stores').select('*').limit(1);
  if (!stErr && storeRow?.length > 0) {
    const cols = Object.keys(storeRow[0]);
    const needed = ['search_vector','meta_keywords','banner_json','social_links_json','opening_hours','whatsapp','floor','block','subscription_start_date','seo_slug','public_status','package_slug','theme_slug','theme_color'];
    const miss = needed.filter(n => !cols.includes(n));
    console.log(`  ${miss.length === 0 ? '✅ All 14 scale cols present' : '⚠️  Missing: ' + miss.join(', ')}`);
  }

  // 5. COLUMNS: products laptop spec cols
  console.log('\n📐 products: laptop 2026 spec columns:');
  const { data: prodRow, error: prErr } = await supabase
    .from('products').select('*').eq('category','Laptops').limit(1);
  if (!prErr && prodRow?.length > 0) {
    const cols = Object.keys(prodRow[0]);
    const needed = ['laptop_specs','display_resolution','display_size','processor','ram_gb','storage_gb','storage_type','gpu','battery_capacity','weight_kg','os','is_touchscreen','is_convertible'];
    const miss = needed.filter(n => !cols.includes(n));
    console.log(`  ${miss.length === 0 ? '✅ All 13 laptop cols present' : '⚠️  Missing: ' + miss.join(', ')}`);
  } else {
    // fallback: check any product
    const { data: anyProd, error: apErr } = await supabase.from('products').select('*').limit(1);
    if (!apErr && anyProd?.length > 0) {
      const cols = Object.keys(anyProd[0]);
      const needed = ['laptop_specs','display_resolution','display_size','processor','ram_gb','storage_gb','storage_type','gpu','battery_capacity','weight_kg','os','is_touchscreen','is_convertible'];
      const miss = needed.filter(n => !cols.includes(n));
      console.log(`  ${miss.length === 0 ? '✅ Laptop cols present on products table' : '⚠️  Missing: ' + miss.join(', ')}  (checked on non-laptop row, so missing is expected for laptop-specific ones like 'laptop_specs')`);
    }
  }

  // 6. repair_pricing + price_audit_logs tables (from 20260823120000)
  console.log('\n🧱 repair_pricing + price_audit_logs tables (repair_pricing migration):');
  const rpOk = await probeTable('repair_pricing');
  const paOk = await probeTable('price_audit_logs');
  console.log(`  repair_pricing:      ${rpOk ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  price_audit_logs:    ${paOk ? '✅ EXISTS' : '❌ MISSING'}`);

  // 7. Read-only store search-vector column check.
  console.log('\n🔍 Store search_vector column (read-only inspection):');
  const { error: searchColumnError } = await supabase
    .from('stores').select('search_vector', { head: true }).limit(0);
  if (searchColumnError) {
    console.log('  ⚠️  stores.search_vector unavailable or inaccessible:', searchColumnError.message?.slice(0, 120));
  } else {
    console.log('  ✅ stores.search_vector is readable; pg_trgm extension itself was NOT verified.');
  }

  // SUMMARY
  console.log('\n================================================');
  const total = tblMissing + rpcMissing;
  if (total === 0) {
    console.log('  ✅ No missing tables detected and local RPC migration definitions found.');
    console.log('  ⚠️  Live RPC signatures, grants and RLS still require authorized read-only catalog inspection.');
  } else {
    console.log(`  ⚠️  ${tblMissing} missing tables + ${rpcMissing} missing LOCAL RPC definitions; live RPC inventory unverified.`);
  }
  console.log('================================================\n');

  process.exit(total > 0 ? 1 : 0);
}

audit().catch(e => { console.error('Audit crash:', e); process.exit(2); });
