
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Corrected key name

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
  console.log("Checking stores table...");
  // Try to select shop_no to see if column exists
  const { data, error, count } = await supabase
    .from('stores')
    .select('id, name, shop_no', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error('Error fetching stores:', error.message);
    if (error.message.includes('shop_no')) {
      console.log("Column 'shop_no' likely missing.");
    }
  } else {
    console.log(`Found ${count} stores.`);
    if (data && data.length > 0) {
      console.log('First store:', data[0]);
    } else {
      console.log('No stores found. Table exists but is empty.');
    }
  }
}

checkStores();
