const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function seedLines() {
  console.log('Fetching No Series headers...')
  const { data: headers, error: hErr } = await supabase.from('no_series').select('*')
  if (hErr) {
    console.error('Error fetching headers:', hErr)
    return
  }

  console.log(`Found ${headers.length} headers.`)

  for (const header of headers) {
    const { data: existingLine } = await supabase
      .from('no_series_lines')
      .select('id')
      .eq('series_code', header.code)
      .eq('starting_date', '2026-04-01')
      .maybeSingle()

    if (!existingLine) {
      console.log(`Inserting line for ${header.code}...`)
      const { error: insertErr } = await supabase.from('no_series_lines').insert([{
        series_code: header.code,
        starting_date: '2026-04-01',
        starting_no: '',
        last_no_used: header.last_no_used || 0,
        increment_by: 1,
        is_open: true
      }])

      if (insertErr) {
        console.error(`Error inserting for ${header.code}:`, insertErr)
      } else {
        console.log(`Success for ${header.code}.`)
      }
    } else {
      console.log(`Line already exists for ${header.code} on 2026-04-01. Skipping.`)
    }
  }

  console.log('Seeding complete.')
}

seedLines()
