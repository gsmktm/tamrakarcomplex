
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
  console.log("Checking content_pages table...");
  const { data, error } = await supabase
    .from('content_pages')
    .select('slug, title');

  if (error) {
    console.error('Error fetching content_pages:', error.message);
    if (error.message.includes('relation "content_pages" does not exist')) {
        console.log("!!! TABLE MISSING: content_pages !!!");
    }
  } else {
    console.log(`Found ${data?.length} content pages.`);
    data?.forEach(p => console.log(` - ${p.title} (${p.slug})`));
  }
}

checkContent();
