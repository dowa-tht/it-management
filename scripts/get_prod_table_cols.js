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

async function main() {
  const { data, error } = await supabase.rpc('execute_sql_query_helper', {
    query_text: `
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'checklist_docs'
      order by ordinal_position;
    `
  })
  
  if (error) {
    // If RPC doesn't exist, we can use a direct SELECT or REST query
    console.log('RPC failed, trying raw query via select...')
    // We can't do arbitrary queries via .select() easily if table has no helper, 
    // but wait! We can just read the OpenAPI spec definitions we downloaded!
    // The OpenAPI spec Definitions are parsed directly from the PostgREST / schema!
    // Let's just look at the keys of prodSchema.definitions.checklist_docs.properties in javascript!
  } else {
    console.log(data)
  }
}

// Let's just parse the OpenAPI JSON we already have on disk!
import fs from 'fs'
const prodSchema = JSON.parse(fs.readFileSync('scratch/prod_openapi.json', 'utf8'))
const props = prodSchema.definitions.checklist_docs.properties
console.log('Production checklist_docs properties:')
for (const p of Object.keys(props)) {
  console.log(`- ${p}: ${props[p].type} (${props[p].format || ''})`)
}

main().catch(console.error)
