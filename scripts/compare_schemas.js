import dotenv from 'dotenv'
import fs from 'fs'

async function fetchSchema(envPath) {
  dotenv.config({ path: envPath, override: true })
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Missing config in ${envPath}`)
  }
  
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch schema from ${envPath}: ${response.statusText}`)
  }
  
  return await response.json()
}

async function main() {
  console.log('Fetching Dev schema...')
  const devSchema = await fetchSchema('.env.local')
  fs.writeFileSync('scratch/dev_openapi.json', JSON.stringify(devSchema, null, 2))
  
  console.log('Fetching Prod schema...')
  const prodSchema = await fetchSchema('.env.production')
  fs.writeFileSync('scratch/prod_openapi.json', JSON.stringify(prodSchema, null, 2))
  
  const targetTables = Object.keys(devSchema.definitions)
  
  console.log('\n======================================================')
  console.log('COMPARING TARGET TABLES SCHEMA: DEV VS PROD')
  console.log('======================================================\n')
  
  const gaps = []
  
  for (const tableName of targetTables) {
    const devTable = devSchema.definitions[tableName]
    const prodTable = prodSchema.definitions[tableName]
    
    if (!devTable) {
      console.log(`Table ${tableName} does not exist in DEV schema! Skipping...`)
      continue
    }
    
    if (!prodTable) {
      gaps.push({
        table: tableName,
        issue_type: 'MISSING_TABLE',
        missing_or_mismatched_field: '-',
        dev_type: '-',
        prod_type: '-',
        impact: 'Critical: Table is completely missing on production',
        sql_patch_needed: `CREATE TABLE public.${tableName} (...);`
      })
      continue
    }
    
    const devProps = devTable.properties || {}
    const prodProps = prodTable.properties || {}
    
    // Check for missing columns in Prod
    for (const propName of Object.keys(devProps)) {
      const devProp = devProps[propName]
      const prodProp = prodProps[propName]
      
      if (!prodProp) {
        let impact = 'High: Column referenced in runtime is missing'
        if (tableName === 'checklist_docs' && propName === 'target_id') {
          impact = 'Critical: Breaker of delete target / history views'
        }
        gaps.push({
          table: tableName,
          issue_type: 'MISSING_COLUMN',
          missing_or_mismatched_field: propName,
          dev_type: devProp.type + (devProp.format ? ` (${devProp.format})` : ''),
          prod_type: '-',
          impact,
          sql_patch_needed: `ALTER TABLE public.${tableName} ADD COLUMN ${propName} ${getSqlType(devProp)};`
        })
      } else {
        // Compare types
        const devType = devProp.type + (devProp.format ? ` (${devProp.format})` : '')
        const prodType = prodProp.type + (prodProp.format ? ` (${prodProp.format})` : '')
        if (devType !== prodType) {
          gaps.push({
            table: tableName,
            issue_type: 'MISMATCHED_TYPE',
            missing_or_mismatched_field: propName,
            dev_type: devType,
            prod_type: prodType,
            impact: 'Medium: Data type mismatch might cause runtime errors',
            sql_patch_needed: `ALTER TABLE public.${tableName} ALTER COLUMN ${propName} TYPE ${getSqlType(devProp)};`
          })
        }
      }
    }
  }
  
  // Format as Markdown table
  let md = '# Production Schema Gap Report\n\n'
  md += `Generated: ${new Date().toISOString()}\n\n`
  
  if (gaps.length === 0) {
    md += '✅ No schema gaps found between DEV and PROD for the target tables!\n'
  } else {
    md += '| Table | Issue Type | Field | Dev Type | Prod Type | Impact | Recommended SQL Patch |\n'
    md += '|---|---|---|---|---|---|---|\n'
    for (const gap of gaps) {
      md += `| \`${gap.table}\` | \`${gap.issue_type}\` | \`${gap.missing_or_mismatched_field}\` | \`${gap.dev_type}\` | \`${gap.prod_type}\` | ${gap.impact} | \`${gap.sql_patch_needed}\` |\n`
    }
  }
  
  fs.writeFileSync('scratch/schema_gap_report.md', md)
  console.log('Markdown report generated at scratch/schema_gap_report.md')
  console.log(md)
}

function getSqlType(prop) {
  if (prop.type === 'string') {
    if (prop.format === 'date-time') return 'timestamp with time zone'
    if (prop.format === 'date') return 'date'
    if (prop.format === 'uuid') return 'uuid'
    return 'text'
  }
  if (prop.type === 'integer') return 'integer'
  if (prop.type === 'number') return 'numeric'
  if (prop.type === 'boolean') return 'boolean'
  if (prop.type === 'array') return 'text[]' // fallback representation
  return 'text'
}

main().catch(err => {
  console.error(err)
})
