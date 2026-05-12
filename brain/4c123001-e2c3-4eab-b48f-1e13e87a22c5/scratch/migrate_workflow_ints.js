import { getSupabaseAdmin } from './lib/supabaseAdmin.js'

async function migrate() {
  const supabase = getSupabaseAdmin()
  console.log('🚀 Starting Workflow Integer Migration...')

  // 1. Workflow Configs - Incident Severity
  const severityMap = { 'Low': '0', 'Medium': '1', 'High': '2' }
  for (const [str, val] of Object.entries(severityMap)) {
    const { error } = await supabase
      .from('workflow_configs')
      .update({ condition_value: val })
      .eq('target_type', 'incident')
      .eq('condition_key', 'severity')
      .eq('condition_value', str)
    
    if (error) console.error(`Error migrating Severity ${str}:`, error.message)
    else console.log(`Migrated Severity: ${str} -> ${val}`)
  }

  // 2. Workflow Configs - Checklist Frequency
  const freqMap = { 'Daily': '0', 'Weekly': '1', 'Monthly': '2', 'Yearly': '3' }
  for (const [str, val] of Object.entries(freqMap)) {
    const { error } = await supabase
      .from('workflow_configs')
      .update({ condition_value: val })
      .eq('target_type', 'checklist')
      .eq('condition_key', 'freq_type')
      .eq('condition_value', str)
    
    if (error) console.error(`Error migrating Frequency ${str}:`, error.message)
    else console.log(`Migrated Frequency: ${str} -> ${val}`)
  }

  // 3. Approval Configs
  // Migrating both incident and checklist config keys
  for (const [str, val] of Object.entries({...severityMap, ...freqMap})) {
    const { error } = await supabase
      .from('approval_configs')
      .update({ freq_type: val })
      .eq('freq_type', str)
    
    if (error) console.error(`Error migrating Approval Config ${str}:`, error.message)
    else console.log(`Migrated Approval Config: ${str} -> ${val}`)
  }

  console.log('✅ Migration Finished.')
}

migrate()
