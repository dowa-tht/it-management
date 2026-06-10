import fs from 'fs'

const devSchema = JSON.parse(fs.readFileSync('scratch/dev_openapi.json', 'utf8'))

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
  if (prop.type === 'array') return 'text[]'
  return 'text'
}

function generateCreateTable(tableName) {
  const table = devSchema.definitions[tableName]
  if (!table) {
    console.error(`Table ${tableName} not found in Dev schema`)
    return
  }
  
  const props = table.properties || {}
  const required = table.required || []
  
  let sql = `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`
  const cols = []
  
  for (const name of Object.keys(props)) {
    const prop = props[name]
    let colDef = `  ${name} ${getSqlType(prop)}`
    
    // Check for ID primary key
    if (name === 'id') {
      colDef += ' PRIMARY KEY DEFAULT gen_random_uuid()'
    }
    
    if (required.includes(name)) {
      colDef += ' NOT NULL'
    }
    
    // Add default values if common
    if (name === 'created_at' || name === 'updated_at') {
      colDef += ' DEFAULT NOW()'
    }
    
    cols.push(colDef)
  }
  
  sql += cols.join(',\n')
  sql += '\n);'
  
  console.log(`\n--- DDL for ${tableName} ---`)
  console.log(sql)
  return sql
}

generateCreateTable('email_logs')
generateCreateTable('approval_tokens')
