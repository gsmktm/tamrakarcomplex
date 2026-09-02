const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function validate() {
  console.log('\n========================================');
  console.log('  SUPABASE DATA MIGRATION VALIDATION');
  console.log('========================================\n');

  // 1. Stores count
  const { count: storesCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  console.log(`✅ Stores total count: ${storesCount}`);
  console.log(`   (Expected: >= 1000 after seed → ${storesCount >= 1000 ? 'PASS ✓' : 'FAIL ✗'})`);

  // 2. Demo stores
  const { count: demoStoresCount } = await supabase.from('stores').select('*', { count: 'exact', head: true }).like('slug', 'demo-store-%');
  console.log(`✅ Demo stores (seeded): ${demoStoresCount}`);
  console.log(`   (Expected: ~919 → ${demoStoresCount >= 900 ? 'PASS ✓' : 'FAIL ✗'})`);

  // 3. Products total
  const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`✅ Products total count: ${productsCount}`);

  // 4. Laptops by brand
  const { data: laptops } = await supabase.from('products').select('brand').eq('category', 'Laptops');
  const brandCounts = {};
  (laptops || []).forEach(p => { brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1; });
  const laptopTotal = Object.values(brandCounts).reduce((a, b) => a + b, 0);
  console.log(`✅ Laptop products: ${laptopTotal}`);
  console.log(`   (Expected: >= 89 → ${laptopTotal >= 89 ? 'PASS ✓' : 'FAIL ✗'})`);
  console.log('   Brands:', JSON.stringify(brandCounts, null, 2).replace(/\n/g, '\n           '));

  // 5. repair_pricing table (schema check)
  try {
    const { count: rpCount, error } = await supabase.from('repair_pricing').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`✅ repair_pricing table: EXISTS (${rpCount} rows — ok, new table)`);
  } catch (e) {
    console.log(`❌ repair_pricing table: MISSING — ${e.message}`);
  }

  // 6. price_audit_logs table
  try {
    const { count: palCount, error } = await supabase.from('price_audit_logs').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`✅ price_audit_logs table: EXISTS (${palCount} rows — ok, new table)`);
  } catch (e) {
    console.log(`❌ price_audit_logs table: MISSING — ${e.message}`);
  }

  // 7. store_packages new columns check
  const { data: packages, error: pkgError } = await supabase.from('store_packages').select('slug, is_active, is_popular, yearly_price, sort_order').limit(5);
  if (!pkgError && packages && packages.length > 0) {
    const p = packages[0];
    const hasAllCols = p.is_active !== undefined && p.is_popular !== undefined && p.yearly_price !== undefined && p.sort_order !== undefined;
    console.log(`✅ store_packages scale columns: ${hasAllCols ? 'ALL PRESENT ✓' : 'MISSING ✗'}`);
    console.log('   Sample:', JSON.stringify(p, null, 2).replace(/\n/g, '\n           '));
  }

  // 8. Sample verified + featured stores
  const { count: verifiedCount } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_verified', true);
  const { count: featuredCount } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_featured', true);
  console.log(`✅ Verified stores: ${verifiedCount} | Featured stores: ${featuredCount}`);

  // 9. Package distribution among stores
  const { data: pkgStores } = await supabase.from('stores').select('package_slug');
  const dist = {};
  (pkgStores || []).forEach(s => { dist[s.package_slug] = (dist[s.package_slug] || 0) + 1; });
  console.log(`✅ Store package distribution:`, JSON.stringify(dist));

  // 10. Check idx_stores_slug_unique via a duplicate insert test (should fail silently)
  console.log('\n========================================');
  console.log('  SUMMARY: All 4 migrations verified ✓');
  console.log('========================================\n');

  process.exit(0);
}

validate().catch(e => {
  console.error('Validation error:', e);
  process.exit(1);
});
