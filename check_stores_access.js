
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tvgmnjuexdgtgtqhrjok.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z21uanVleGRndGd0cWhyam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTcxNDQsImV4cCI6MjA4ODEzMzE0NH0.VMJCM_-Qf5g-l88aQZDd5NP65S9JRlZrNjLpnt6uO7o'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStores() {
  console.log('Checking stores access...')
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error fetching stores:', error)
  } else {
    console.log('Successfully fetched stores:', data.length)
    if (data.length > 0) {
      console.log('First store:', data[0])
    }
  }
}

checkStores()
