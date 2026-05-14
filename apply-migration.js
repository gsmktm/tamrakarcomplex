#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tvgmnjuexdgtgtqhrjok.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey || serviceRoleKey === 'your-service-role-key') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found or not set. Cannot apply migrations.');
  console.error('Please set the service role key in your .env file.');
  process.exit(1);
}

console.log(`🔗 Connecting to Supabase: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Read migration files
const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrationFile = '20260510000000_fix_marketplace_listings_rls.sql';
const migrationPath = path.join(migrationsDir, migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(`\n📝 Executing migration: ${migrationFile}\n`);

// Execute the SQL
supabase.rpc('execute_sql', { sql_text: sql })
  .then((result) => {
    console.log('✅ Migration applied successfully!');
    console.log(result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error applying migration:', error);
    
    // Try using the raw fetch API instead
    console.log('\n🔄 Trying alternative approach...\n');
    
    const headers = {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
    
    // For Supabase, we can use the SQL endpoint directly
    // Note: This requires executing via pgAdmin or SQL editor in Supabase UI
    console.log('⚠️  Direct SQL execution via API not available.');
    console.log('\nTo apply this migration, please:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/projects');
    console.log('2. Select your project (tvgmnjuexdgtgtqhrjok)');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the SQL from: supabase/migrations/20260510000000_fix_marketplace_listings_rls.sql');
    console.log('5. Click "Run"');
    
    process.exit(1);
  });
