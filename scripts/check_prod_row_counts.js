import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing config')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error(`Error checking ${table}:`, error.message)
    return -1
  }
  return count
}

async function main() {
  const tables = [
    'checklist_docs',
    'checklist_templates',
    'system_logs',
    'no_series_lines',
    'incidents',
    'user_profiles'
  ]
  
  console.log('Production row counts for tables with mismatched types/columns:')
  for (const t of tables) {
    const count = await checkRows(t)
    console.log(`- ${t}: ${count} rows`)
  }
}

main().catch(console.error)
