
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tvgmnjuexdgtgtqhrjok.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z21uanVleGRndGd0cWhyam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTcxNDQsImV4cCI6MjA4ODEzMzE0NH0.VMJCM_-Qf5g-l88aQZDd5NP65S9JRlZrNjLpnt6uO7o'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkListings() {
  console.log('Checking marketplace listings...')
  
  // Check count
  const { count, error: countError } = await supabase
    .from('sell_listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  if (countError) {
    console.error('Error fetching count:', countError)
  } else {
    console.log('Total active listings:', count)
  }

  // Fetch some data
  const { data, error } = await supabase
    .from('sell_listings')
    .select('*')
    .eq('status', 'active')
    .limit(5)
  
  if (error) {
    console.error('Error fetching listings:', error)
  } else {
    console.log('Fetched listings:', data?.length)
    if (data && data.length > 0) {
      console.log('First listing:', {
        id: data[0].id,
        title: data[0].title,
        price: data[0].price,
        images: data[0].images
      })
    }
  }
}

checkListings()
