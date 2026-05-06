const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function migrateData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🚀 Starting Data Migration...')

  // 1. Migrate Checklist Docs
  console.log('--- Migrating Checklist Docs ---')
  const { data: checklists } = await supabase
    .from('checklist_docs')
    .select('id, status, approved_by, approved_at, assigned_approver_id')
    .in('status', ['Closed', 'Pending Approval'])

  for (const doc of (checklists || [])) {
    const isApproved = doc.status === 'Closed'
    
    // Get approver profile ID if possible (fallback to original field)
    let approverId = doc.assigned_approver_id || doc.approved_by
    if (approverId && !approverId.includes('-')) { // If it's an email, we need to find the UUID
        const { data: p } = await supabase.from('user_profiles').select('id').eq('email', approverId).single()
        if (p) approverId = p.id
    }

    const insert = {
      doc_id: doc.id,
      doc_type: 'checklist',
      step_order: 1,
      approver_id: (approverId && approverId.includes('-')) ? approverId : null,
      status: isApproved ? 'approved' : 'pending',
      action_at: doc.approved_at || null
    }
    
    await supabase.from('document_approvals').insert([insert])
  }
  console.log(`✅ Checklist Migration Done: ${checklists?.length || 0} records`)

  // 2. Migrate Incidents
  console.log('\n--- Migrating Incidents ---')
  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, status, signature_it, signature_reporter, signature_manager, resolved_by, reported_by_id, approved_by, resolved_at, approved_at')

  for (const incident of (incidents || [])) {
    // Step 1: IT
    if (incident.signature_it || incident.status === 'Closed' || incident.status === 'Pending Approval') {
      await supabase.from('document_approvals').insert([{
        doc_id: incident.id,
        doc_type: 'incident',
        step_order: 1,
        status: incident.signature_it ? 'approved' : 'pending',
        signature_data: incident.signature_it,
        action_at: incident.resolved_at
      }])
    }

    // Step 2: Reporter
    if (incident.signature_reporter || incident.status === 'Closed') {
      await supabase.from('document_approvals').insert([{
        doc_id: incident.id,
        doc_type: 'incident',
        step_order: 2,
        status: incident.signature_reporter ? 'approved' : 'pending',
        approver_id: incident.reported_by_id,
        signature_data: incident.signature_reporter,
        action_at: incident.resolved_at // Fallback
      }])
    }

    // Step 3: Manager (only for high severity cases usually, but we migrate if signature exists)
    if (incident.signature_manager || incident.status === 'Closed') {
      await supabase.from('document_approvals').insert([{
        doc_id: incident.id,
        doc_type: 'incident',
        step_order: 3,
        status: incident.signature_manager ? 'approved' : 'pending',
        signature_data: incident.signature_manager,
        action_at: incident.approved_at
      }])
    }
  }
  console.log(`✅ Incident Migration Done: ${incidents?.length || 0} records`)
}

migrateData()
