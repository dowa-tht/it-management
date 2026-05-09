const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually parse .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugNoSeries() {
  console.log('--- Debugging No Series for INC ---')
  
  // 1. Check No Series Config
  const { data: header, error: hErr } = await supabase.from('no_series').select('*').eq('code', 'INC').single()
  if (hErr) {
    console.error('Error fetching No Series header:', hErr)
    return
  }
  console.log('Header Config:', header)

  // 2. Check Max Incident
  const { data: maxInc } = await supabase
    .from('incidents')
    .select('case_number')
    .order('case_number', { ascending: false })
    .limit(10)
  
  console.log('Recent 10 Incidents (Desc):', maxInc?.map(i => i.case_number))

  // 3. Try simulate getNextNo logic
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const prefix = header.format.replace('YY', yy).replace('MM', mm).replace(/#/g, '')
  
  console.log('Searching with prefix:', prefix)

  const { data: maxMatch } = await supabase
    .from('incidents')
    .select('case_number')
    .like('case_number', `${prefix}%`)
    .order('case_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  console.log('Max Match for Prefix:', maxMatch)
  
  if (maxMatch) {
     const hashCount = (header.format.match(/#/g) || []).length
     const lastNumStr = maxMatch.case_number.replace(/[^0-9]/g, '').slice(-hashCount)
     const nextNum = (parseInt(lastNumStr) || 0) + 1
     const numStr = String(nextNum).padStart(hashCount, '0')
     const nextNo = prefix + numStr
     console.log('Calculated Next No:', nextNo)
  }
}

debugNoSeries()
