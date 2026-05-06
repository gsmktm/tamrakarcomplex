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

async function checkArticles() {
  console.log("Checking articles table...");
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, category, published')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching articles:', error.message);
    if (error.message.includes('relation "articles" does not exist')) {
        console.log("!!! TABLE MISSING: articles !!!");
    }
  } else {
    console.log(`Found ${data?.length} articles.`);
    data?.forEach(a => console.log(` - ${a.title} (${a.category}) - published: ${a.published}`));
  }
}

checkArticles();