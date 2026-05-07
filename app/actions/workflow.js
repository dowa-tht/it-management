'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function recordLog(docId, type, action, details, userEmail) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const table = type === 'checklist' ? 'checklist_logs' : 'incident_logs'
    const fullAction = details ? `${action}: ${details}` : action
    
    const { error } = await supabaseAdmin.from(table).insert({
      doc_id: docId,
      action: fullAction,
      user_email: userEmail
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('recordLog Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getUnifiedPendingApprovals() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get User Profile ID
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch Pending Checklists
    const chkQuery = supabaseAdmin
      .from('checklist_docs')
      .select(`
        id, 
        freq_type, 
        period_date, 
        status, 
        assigned_approver_id,
        created_by,
        document_approvals!inner(id, status, role_required, approver_id)
      `)
      .eq('workflow_status', 'pending')
      .eq('document_approvals.status', 'pending')

    if (profile.role !== 'administrator') {
      chkQuery.or(`document_approvals.approver_id.eq.${profile.id},document_approvals.role_required.eq.${profile.role}`)
    }

    const { data: checklists, error: chkErr } = await chkQuery

    // 3. Fetch Pending Incidents
    const incQuery = supabaseAdmin
      .from('incidents')
      .select(`
        id, 
        case_number, 
        title, 
        status, 
        created_at,
        assigned_approver_id,
        user_profiles!incidents_created_by_fkey(full_name),
        document_approvals!inner(id, status, role_required, approver_id)
      `)
      .eq('status', 'Pending Approval')
      .eq('document_approvals.status', 'pending')

    if (profile.role !== 'administrator') {
      incQuery.or(`document_approvals.approver_id.eq.${profile.id},document_approvals.role_required.eq.${profile.role}`)
    }

    const { data: incidents, error: incErr } = await incQuery

    // 4. Transform into Unified Format
    const unified = [
      ...(checklists || []).map(c => ({
        id: c.id,
        category: 'Checklist',
        type: c.freq_type,
        docNo: `CHK-${c.period_date}-${c.freq_type.charAt(0)}`,
        subject: `IT Checklist (${c.freq_type}) - ${c.period_date}`,
        requestDate: c.period_date,
        requester: c.created_by || 'System',
        link: `/dashboard/checklist/${c.id}`
      })),
      ...(incidents || []).map(i => ({
        id: i.id,
        category: 'Incident',
        type: 'Ticket',
        docNo: i.case_number,
        subject: i.title,
        requestDate: i.created_at.split('T')[0],
        requester: i.user_profiles?.full_name || 'Unknown',
        link: `/dashboard/incidents/${i.id}`
      }))
    ]

    // Sort by date descending
    unified.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))

    return { data: unified }
  } catch (err) {
    console.error('getUnifiedPendingApprovals Error:', err)
    return { error: err.message }
  }
}

export async function getUnifiedMyPendingItems() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get User Profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch My Pending Checklists (Sent by me, still pending)
    const { data: checklists } = await supabaseAdmin
      .from('checklist_docs')
      .select(`id, freq_type, period_date, status, workflow_status, created_by, assigned_approver_id`)
      .in('workflow_status', ['pending', 'PENDING'])
      .eq('created_by', profile.email)

    // 3. Fetch My Pending Incidents (Sent by me OR Reported by me, still pending approval)
    const { data: incidents } = await supabaseAdmin
      .from('incidents')
      .select(`id, case_number, title, status, created_at, reported_by, assigned_to, created_by`)
      .ilike('status', 'Pending Approval')
      .or(`reported_by.eq.${profile.email},assigned_to.eq.${profile.email},assigned_to.eq.${profile.full_name},created_by.eq.${profile.id}`)

    // 4. Transform into Unified Format
    const unified = [
      ...(checklists || []).map(c => ({
        id: c.id,
        category: 'Checklist',
        type: c.freq_type,
        docNo: `CHK-${c.period_date}-${c.freq_type.charAt(0)}`,
        subject: `IT Checklist (${c.freq_type}) - ${c.period_date}`,
        requestDate: c.period_date,
        status: 'Waiting for Approver',
        link: `/dashboard/checklist/${c.id}`
      })),
      ...(incidents || []).map(i => ({
        id: i.id,
        category: 'Incident',
        type: 'Ticket',
        docNo: i.case_number,
        subject: i.title,
        requestDate: i.created_at.split('T')[0],
        status: 'Waiting for Approval',
        link: `/dashboard/incidents/${i.id}`
      }))
    ]

    unified.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
    return { data: unified }
  } catch (err) {
    console.error('getUnifiedMyPendingItems Error:', err)
    return { error: err.message }
  }
}

export async function getSystemLogs(type = 'audit') {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    if (type === 'login') {
      const { data, error } = await supabaseAdmin
        .from('login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error

      // Map names for login logs
      const emails = [...new Set(data.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = data.map(l => ({
        ...l,
        full_name: nameMap[l.user_email] || l.user_email
      }))

      return { data: mapped }
    }

    if (type === 'audit') {
      const { data: chkLogs } = await supabaseAdmin
        .from('checklist_logs')
        .select('id, action, created_at, user_email')
        .order('created_at', { ascending: false })
        .limit(100)
      
      const { data: incLogs } = await supabaseAdmin
        .from('incident_logs')
        .select('id, action, created_at, user_email')
        .order('created_at', { ascending: false })
        .limit(100)

      const combined = [
        ...(chkLogs || []).map(l => ({ ...l, category: 'Checklist' })),
        ...(incLogs || []).map(l => ({ ...l, category: 'Incident' }))
      ]

      // Fetch names for all emails
      const emails = [...new Set(combined.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = combined.map(l => ({
        ...l,
        full_name: nameMap[l.user_email] || l.user_email
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return { data: mapped }
    }

    if (type === 'approval') {
      const approvalActions = [
        'Submitted', 'Approved', 'Rejected', 'Delegated', 'Auto-Approved', 'Cancelled',
        'ปิดเอกสาร (Closed)', 'บันทึกร่าง', 'ส่งเอกสารเพื่อขออนุมัติ',
        'Submitted: ส่งเอกสารขออนุมัติ', 'Cancelled: ยกเลิกการส่งอนุมัติโดยผู้แจ้ง'
      ]
      
      const { data: chkLogs } = await supabaseAdmin
        .from('checklist_logs')
        .select(`
          id, doc_id, action, created_at, user_email,
          checklist_docs(doc_no, period_date, freq_type, workflow_status, status)
        `)
        .order('created_at', { ascending: false })

      const { data: incLogs } = await supabaseAdmin
        .from('incident_logs')
        .select(`
          id, doc_id, action, created_at, user_email,
          incidents(case_number, title, status)
        `)
        .order('created_at', { ascending: false })

      const combined = [
        ...(chkLogs || []).map(l => ({
          id: l.id,
          doc_id: l.doc_id,
          category: 'Checklist',
          docNo: l.checklist_docs?.doc_no || 'N/A',
          subject: `${l.checklist_docs?.freq_type} - ${l.checklist_docs?.period_date}`,
          current_workflow_status: l.checklist_docs?.workflow_status,
          current_status: l.checklist_docs?.status,
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        })),
        ...(incLogs || []).map(l => ({
          id: l.id,
          doc_id: l.doc_id,
          category: 'Incident',
          docNo: l.incidents?.case_number || 'N/A',
          subject: l.incidents?.title || 'N/A',
          current_workflow_status: l.incidents?.status === 'Pending Approval' ? 'pending' : 'other',
          current_status: l.incidents?.status,
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        }))
      ]
      
      // Fetch names for all emails
      const emails = [...new Set(combined.map(l => l.user).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const filtered = combined.map(l => ({
        ...l,
        user: nameMap[l.user] || l.user
      })).filter(l => 
        approvalActions.includes(l.action) || 
        l.action.startsWith('Submitted:') || 
        l.action.startsWith('Cancelled:') ||
        l.action.startsWith('Approved:') ||
        l.action.startsWith('Rejected:')
      )

      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      return { data: filtered }
    }

    return { data: [] }
  } catch (err) {
    console.error('getSystemLogs Error:', err)
    return { error: err.message }
  }
}

export async function submitRequest(docId, targetType, triggerKey, userEmail) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Find the current assigned approver from config
    const { data: config } = await supabaseAdmin
      .from('approval_configs')
      .select('primary_approver_id')
      .eq('target_type', targetType)
      .eq('freq_type', triggerKey)
      .single()

    let approverName = 'ระบบ Pool'
    if (config?.primary_approver_id) {
      const { data: apProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', config.primary_approver_id)
        .single()
      if (apProfile) approverName = apProfile.full_name
    }

    const isAutoApprove = !config || !config.primary_approver_id

    // 2. Generate Steps in the new table
    const { success, autoApproved } = await generateWorkflowSteps(docId, targetType, targetType === 'checklist' ? 'freq_type' : 'severity', triggerKey)

    const finalAutoApprove = isAutoApprove || autoApproved

    const { error } = await supabaseAdmin
      .from(targetType === 'checklist' ? 'checklist_docs' : 'incidents')
      .update({
        workflow_status: finalAutoApprove ? 'approved' : 'pending',
        status: finalAutoApprove ? 'Closed' : 'Pending Approval',
        assigned_approver_id: config?.primary_approver_id || null
      })
      .eq('id', docId)
    
    if (error) throw error

    await recordLog(docId, targetType, finalAutoApprove ? 'Auto-Approved' : 'Submitted', finalAutoApprove 
      ? 'ระบบอนุมัติงานให้อัตโนมัติตามการตั้งค่า' 
      : `ส่งเอกสารเพื่อขออนุมัติ (ระบบ Workflow ใหม่ - ผู้อนุมัติหลัก: ${approverName})`, userEmail)

    return { success: true, autoApproved: finalAutoApprove }
  } catch (err) {
    console.error('submitRequest Error:', err)
    return { success: false, error: err.message }
  }
}

// ==========================================
// UNIFIED WORKFLOW ENGINE FUNCTIONS
// ==========================================

export async function generateWorkflowSteps(docId, targetType, conditionKey, conditionValue) {
  try {
    const supabaseAdmin = getAdminClient()

    // 1. Get configs for this doc type
    const { data: configs } = await supabaseAdmin
      .from('workflow_configs')
      .select('*')
      .eq('target_type', targetType)
      .eq('condition_key', conditionKey)
      .eq('condition_value', conditionValue)
      .eq('is_active', true)
      .order('step_order')

    if (!configs || configs.length === 0) return { success: true, autoApproved: true }

    // 2. Create actual approval steps for this document
    const inserts = configs.map((c, idx) => ({
      doc_id: docId,
      doc_type: targetType,
      step_order: c.step_order,
      status: idx === 0 ? 'pending' : 'waiting', // First step starts as pending
      role_required: c.role_required
    }))

    const { error } = await supabaseAdmin.from('document_approvals').insert(inserts)
    if (error) throw error

    return { success: true, autoApproved: false }
  } catch (err) {
    console.error('generateWorkflowSteps Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getDocumentWorkflowStatus(docId) {
  try {
    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('document_approvals')
      .select(`
        *,
        user_profiles!document_approvals_approver_id_fkey(full_name, role)
      `)
      .eq('doc_id', docId)
      .order('step_order')

    if (error) throw error
    return { data }
  } catch (err) {
    console.error('getDocumentWorkflowStatus Error:', err)
    return { error: err.message }
  }
}

export async function submitApprovalStep(docId, docType, stepId, signatureData, comment = '') {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    
    // 1. Get current step info
    const { data: currentStep } = await supabaseAdmin
      .from('document_approvals')
      .select('*')
      .eq('id', stepId)
      .single()

    if (!currentStep || currentStep.status !== 'pending') return { error: 'Step not ready for approval' }

    // 2. Mark current step as approved
    const { error: updateErr } = await supabaseAdmin
      .from('document_approvals')
      .update({
        status: 'approved',
        approver_id: session.user.id,
        signature_data: signatureData,
        comment: comment,
        action_at: new Date().toISOString()
      })
      .eq('id', stepId)

    if (updateErr) throw updateErr

    // 3. Find and unlock the NEXT step
    const { data: nextStep } = await supabaseAdmin
      .from('document_approvals')
      .select('*')
      .eq('doc_id', docId)
      .eq('step_order', currentStep.step_order + 1)
      .single()

    if (nextStep) {
      await supabaseAdmin
        .from('document_approvals')
        .update({ status: 'pending' })
        .eq('id', nextStep.id)
    } else {
      // All steps completed! Update main document to Closed
      const table = docType === 'checklist' ? 'checklist_docs' : 'incidents'
      await supabaseAdmin
        .from(table)
        .update({ 
          status: 'Closed',
          workflow_status: 'approved'
        })
        .eq('id', docId)
    }

    await recordLog(docId, docType, 'Approved', `อนุมัติขั้นตอนลำดับที่ ${currentStep.step_order} โดย ${session.user.email}`, session.user.email)

    return { success: true, isFinal: !nextStep }
  } catch (err) {
    console.error('submitApprovalStep Error:', err)
    return { error: err.message }
  }
}

// MIGRATION HELPER (Call once)
export async function runWorkflowMigration() {
  try {
    const supabaseAdmin = getAdminClient()
    console.log('--- START MIGRATION ---')

    // Checklist Migration
    const { data: checklists } = await supabaseAdmin
      .from('checklist_docs')
      .select('id, status, approved_by, approved_at, assigned_approver_id')
      .in('status', ['Closed', 'Pending Approval'])

    for (const doc of (checklists || [])) {
      const { data: existing } = await supabaseAdmin.from('document_approvals').select('id').eq('doc_id', doc.id).limit(1)
      if (existing?.length > 0) continue

      const isApproved = doc.status === 'Closed'
      let approverId = doc.assigned_approver_id || doc.approved_by
      if (approverId && !approverId.includes('-')) {
          const { data: p } = await supabaseAdmin.from('user_profiles').select('id').eq('email', approverId).single()
          if (p) approverId = p.id
      }

      // 🛡️ Determine role_required from config if not approved
      let roleReq = 'administrator' // Default fallback
      if (!isApproved) {
        const { data: config } = await supabaseAdmin
          .from('workflow_configs')
          .select('role_required')
          .eq('target_type', 'checklist')
          .eq('condition_value', doc.freq_type)
          .eq('step_order', 1)
          .maybeSingle()
        if (config) roleReq = config.role_required
      }

      await supabaseAdmin.from('document_approvals').insert([{
        doc_id: doc.id, doc_type: 'checklist', step_order: 1,
        approver_id: (approverId && approverId.includes('-')) ? approverId : null,
        status: isApproved ? 'approved' : 'pending',
        role_required: roleReq,
        action_at: doc.approved_at || null
      }])
    }

    // Incident Migration
    const { data: incidents } = await supabaseAdmin
      .from('incidents')
      .select('id, status, signature_it, signature_reporter, signature_manager, resolved_by, created_by, approved_by, resolved_at, approved_at')

    for (const i of (incidents || [])) {
      const { data: existing } = await supabaseAdmin.from('document_approvals').select('id').eq('doc_id', i.id).limit(1)
      if (existing?.length > 0) continue

      // IT Step
      if (i.signature_it || i.status === 'Closed' || i.status === 'Pending Approval') {
        await supabaseAdmin.from('document_approvals').insert([{
          doc_id: i.id, doc_type: 'incident', step_order: 1,
          status: i.signature_it ? 'approved' : (i.status === 'Pending Approval' ? 'pending' : 'waiting'),
          signature_data: i.signature_it, action_at: i.resolved_at
        }])
      }
      // Reporter Step
      if (i.signature_reporter || i.status === 'Closed' || (i.status === 'Pending Approval' && i.signature_it)) {
        await supabaseAdmin.from('document_approvals').insert([{
          doc_id: i.id, doc_type: 'incident', step_order: 2,
          status: i.signature_reporter ? 'approved' : (i.signature_it ? 'pending' : 'waiting'),
          approver_id: i.created_by, signature_data: i.signature_reporter, action_at: i.resolved_at
        }])
      }
      // Manager Step
      if (i.signature_manager || i.status === 'Closed') {
        await supabaseAdmin.from('document_approvals').insert([{
          doc_id: i.id, doc_type: 'incident', step_order: 3,
          status: i.signature_manager ? 'approved' : (i.signature_reporter ? 'pending' : 'waiting'),
          signature_data: i.signature_manager, action_at: i.approved_at
        }])
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Migration Error:', err)
    return { error: err.message }
  }
}

export async function adminResetWorkflow(docId, docType, password) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'internal') return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify Admin Role
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'administrator') return { error: 'Access Denied: Administrator role required.' }

    // 2. Verify Password (by trying to sign in with a fresh client)
    const { error: authError } = await createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      .auth.signInWithPassword({
        email: session.user.email,
        password: password
      })

    if (authError) return { error: 'รหัสผ่านไม่ถูกต้อง การยืนยันตัวตนล้มเหลว' }

    // 3. Reset Workflow
    const table = docType === 'Checklist' ? 'checklist_docs' : 'incidents'
    const updateData = {
      workflow_status: null,
      status: 'Open',
      assigned_approver_id: null,
      approved_by: null,
      approved_at: null
    }

    const { error: resetError } = await supabaseAdmin
      .from(table)
      .update(updateData)
      .eq('id', docId)

    if (resetError) throw resetError

    // 4. Record Log
    await recordLog(docId, docType.toLowerCase(), 'Admin Override', `ยกเลิกการอนุมัติ (Workflow Reset) โดย ${profile.full_name} ผ่านหน้าจอ Approval Logs`, session.user.email)

    return { success: true }
  } catch (err) {
    console.error('adminResetWorkflow Error:', err)
    return { error: err.message }
  }
}
