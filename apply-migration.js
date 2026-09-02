#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tvgmnjuexdgtgtqhrjok.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey || serviceRoleKey === 'your-service-role-key') {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found or not set. Cannot apply migrations.');
  console.error('Please set the service role key in your .env file.');
  process.exit(1);
}

console.log(`Connecting to Supabase: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Read migration file from CLI argument or default
const migrationFile = process.argv[2] || '20260510000000_fix_marketplace_listings_rls.sql';
const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrationPath = path.join(migrationsDir, migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  console.error('Usage: node apply-migration.js <migration-file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(`\nExecuting migration: ${migrationFile}\n`);

supabase.rpc('execute_sql', { sql_text: sql })
  .then((result) => {
    console.log('Migration applied successfully!');
    console.log(result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error applying migration:', error);
    console.log('\nTo apply this migration manually:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/projects');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log(`4. Copy and paste the SQL from: supabase/migrations/${migrationFile}`);
    console.log('5. Click "Run"');
    process.exit(1);
  });
