#!/usr/bin/env node

/**
 * Deploy RPC Functions to Supabase
 *
 * Usage: node deploy-rpc-functions.cjs <migration-file.sql>
 *
 * This script reads a migration SQL file and executes it against your
 * Supabase database using the service role key.
 */

const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Error: VITE_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'your-service-role-key') {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not configured or is a placeholder.');
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Read migration file from CLI argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Error: No migration file specified.');
  console.error('Usage: node deploy-rpc-functions.cjs <migration-file.sql>');
  process.exit(1);
}

const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`Error: Migration file not found at ${migrationPath}`);
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

console.log(`Deploying RPC functions to Supabase...`);
console.log(`Target: ${supabaseUrl}`);
console.log(`Migration file: ${migrationFile}`);

async function deploy() {
  try {
    // Execute SQL via Supabase REST API using the execute_sql RPC
    const { data, error } = await supabase.rpc('execute_sql', { sql_text: migrationSql });

    if (error) {
      console.error('Error executing migration:', error.message);
      console.log('\nTo apply this migration manually:');
      console.log('1. Go to https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log(`4. Copy and paste the contents of: supabase/migrations/${migrationFile}`);
      console.log('5. Click "Run"');
      process.exit(1);
    }

    console.log('Migration deployed successfully!');
    console.log(data);
    process.exit(0);
  } catch (error) {
    console.error('Deployment error:', error.message);
    process.exit(1);
  }
}

deploy();
