import fs from 'fs'

const devSchema = JSON.parse(fs.readFileSync('scratch/dev_openapi.json', 'utf8'))
const prodSchema = JSON.parse(fs.readFileSync('scratch/prod_openapi.json', 'utf8'))

console.log('Checking for columns or tables that exist on Production but are NOT in Dev (custom changes)...')

const prodTables = Object.keys(prodSchema.definitions || {})

for (const tableName of prodTables) {
  const prodTable = prodSchema.definitions[tableName]
  const devTable = devSchema.definitions[tableName]
  
  if (!devTable) {
    console.log(`[Custom Table on Prod]: ${tableName}`)
    continue
  }
  
  const prodProps = prodTable.properties || {}
  const devProps = devTable.properties || {}
  
  for (const propName of Object.keys(prodProps)) {
    if (!devProps[propName]) {
      console.log(`[Custom Column on Prod]: ${tableName}.${propName} (${prodProps[propName].type})`)
    }
  }
}
