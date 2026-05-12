
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkNoSeries() {
  console.log('--- no_series ---')
  const { data: h } = await supabase.from('no_series').select('*')
  console.log(h)

  console.log('--- no_series_lines ---')
  const { data: l } = await supabase.from('no_series_lines').select('*')
  console.log(l)
}

checkNoSeries()
