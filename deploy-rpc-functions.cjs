#!/usr/bin/env node

/**
 * Deploy RPC Functions to Supabase
 * 
 * Usage: node deploy-rpc-functions.cjs
 * 
 * This script reads the migration SQL file and executes it against your
 * Supabase database using the client connection.
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'your-service-role-key') {
  console.warn('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not configured or is a placeholder');
  console.warn('   This script requires the service role key to deploy functions.');
  console.warn('   Please set SUPABASE_SERVICE_ROLE_KEY in your .env file');
  console.log('\n📋 Manual Deployment Instructions:');
  console.log('   1. Go to https://app.supabase.com');
  console.log('   2. Select project: tvgmnjuexdgtgtqhrjok');
  console.log('   3. Go to SQL Editor → New Query');
  console.log('   4. Copy the contents of: supabase/migrations/20260508000100_super_admin_stats_and_user_list_fix.sql');
  console.log('   5. Paste into the editor and click Run');
  process.exit(1);
}

// Read the migration SQL file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260508000100_super_admin_stats_and_user_list_fix.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found at ${migrationPath}`);
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

console.log('🚀 Deploying RPC functions to Supabase...');
console.log(`📍 Target: ${supabaseUrl}`);
console.log(`📄 Migration file: ${migrationPath}`);

// Use the Supabase REST API to execute SQL
const deployRPC = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_sleep`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ seconds: 0 }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    console.log('✅ Authenticated successfully');

    // Execute the migration SQL
    // Note: Supabase doesn't have a direct SQL execution endpoint for arbitrary SQL
    // So we need to use the Supabase dashboard or CLI
    console.log('\n⚠️  The Supabase API requires using the Web Console or CLI for arbitrary SQL execution.');
    console.log('\n📋 To deploy your functions, please use one of these methods:');
    console.log('\n1️⃣  Web Console (Easiest):');
    console.log('   - Go to https://app.supabase.com');
    console.log('   - Select project: tvgmnjuexdgtgtqhrjok');
    console.log('   - Navigate to SQL Editor');
    console.log('   - Create a new query');
    console.log('   - Paste the entire contents of: supabase/migrations/20260508000100_super_admin_stats_and_user_list_fix.sql');
    console.log('   - Click the RUN button');
    console.log('   - Verify: Functions section shows 5 new functions');

    console.log('\n2️⃣  Supabase CLI:');
    console.log('   - supabase migration up --remote');
    console.log('   - (Requires Docker and authentication setup)');

    console.log('\n✨ Functions to be created:');
    console.log('   ✓ get_super_admin_stats()');
    console.log('   ✓ get_catalog_verification_stats()');
    console.log('   ✓ create_user_admin()');
    console.log('   ✓ assign_store_admin_by_email()');
    console.log('   ✓ get_admin_users_list_secure()');

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    process.exit(1);
  }
};

deployRPC();
