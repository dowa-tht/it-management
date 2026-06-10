import dotenv from 'dotenv'
import fs from 'fs'

// Load production environment variables
dotenv.config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing URL or service role key')
  process.exit(1)
}

async function main() {
  console.log('Fetching OpenAPI schema from production Supabase Rest endpoint...')
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  })
  
  if (!response.ok) {
    console.error('Failed to fetch:', response.status, response.statusText)
    const text = await response.text()
    console.error(text)
    process.exit(1)
  }
  
  const data = await response.json()
  console.log('Schema fetched successfully!')
  
  // Save to a temporary file in scratch
  fs.writeFileSync('scratch/prod_openapi.json', JSON.stringify(data, null, 2))
  console.log('Saved to scratch/prod_openapi.json')
  
  // Print list of tables
  const tables = Object.keys(data.definitions || {})
  console.log('Tables found in OpenAPI:', tables)
}

main().catch(err => {
  console.error(err)
})
