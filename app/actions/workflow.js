'use server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getCurrentUserSession } from './user'
import { verifyEmployeePIN } from './users'
import { WORKFLOW_DOC_REGISTRY, getMappedWorkflowValue } from '@/lib/workflowRegistry'
import { sendEmail } from '@/lib/resend'

const getAdminClient = getSupabaseAdmin

/**
 * 🔗 Cross-Module Sync & Final Actions
 */
async function onDocumentFinalApproval(docId, docType) {
  try {
    const supabaseAdmin = getAdminClient()
    
    const reg = WORKFLOW_DOC_REGISTRY[docType]
    if (!reg) return

    if (docType === 'incident') {
      const { data: incident } = await supabaseAdmin
        .from(reg.table)
        .select(`ref_type, ref_id, ${reg.no_field}, resolution`)
        .eq('id', docId)
        .single()

      if (incident?.ref_type === 'checklist' && incident?.ref_id) {
        // Update checklist item to OK
        const resolutionMark = `[Corrected: ${incident.case_number}] ${incident.resolution || ''}`
        
        const { data: item } = await supabaseAdmin
          .from('checklist_items')
          .select('notes')
          .eq('id', incident.ref_id)
          .single()

        const newNotes = `${item?.notes || ''}${item?.notes ? '\n' : ''}${resolutionMark}`

        await supabaseAdmin
          .from('checklist_items')
          .update({ 
            status: 'OK',
            notes: newNotes
          })
          .eq('id', incident.ref_id)
          
        await recordLog(incident.ref_id, 'checklist', 'System', `Auto-update OK | แก้ไขรายการ NG อัตโนมัติจากเคส ${incident.case_number}`, 'system@workflow.internal')
      }
    }
  } catch (err) {
    console.error('onDocumentFinalApproval Error:', err)
  }
}

export async function recordLog(docId, type, action, details, userEmail) {
  return recordAuditLog({ docId, docType: type, action, details, userEmail })
}

async function resolveDynamicWorkflowApproverId(step, doc) {
  if (step.role_required === 'reporter') {
    return doc?.reported_by_id || null
  }
  return step.approver_id || null
}

export async function syncDynamicWorkflowApprovers(docId, docType) {
  try {
    const supabaseAdmin = getAdminClient()
    const reg = WORKFLOW_DOC_REGISTRY[docType?.toLowerCase()]
    if (!reg) return { success: false, error: 'Invalid document type' }

    const { data: doc, error: docErr } = await supabaseAdmin
      .from(reg.table)
      .select('reported_by_id')
      .eq('id', docId)
      .single()

    if (docErr) throw docErr

    const { data: steps, error: stepsErr } = await supabaseAdmin
      .from('document_approvals')
      .select('id, role_required, approver_id, status')
      .eq('doc_id', docId)
      .eq('doc_type', docType.toLowerCase())
      .in('status', ['pending', 'waiting'])

    if (stepsErr) throw stepsErr

    for (const step of steps || []) {
      const resolvedApproverId = await resolveDynamicWorkflowApproverId(step, doc)
      if (resolvedApproverId && resolvedApproverId !== step.approver_id) {
        const { error: updateErr } = await supabaseAdmin
          .from('document_approvals')
          .update({ approver_id: resolvedApproverId })
          .eq('id', step.id)
        if (updateErr) throw updateErr
      }
    }

    return { success: true }
  } catch (err) {
    console.error('syncDynamicWorkflowApprovers Error:', err)
    return { success: false, error: err.message }
  }
}

export async function diagnoseApprovalPin(docId, docType, stepId, pin) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    if (!/^\d{6}$/.test(pin || '')) return { success: false, error: 'PIN must be 6 digits' }

    const supabaseAdmin = getAdminClient()
    const reg = WORKFLOW_DOC_REGISTRY[docType?.toLowerCase()]
    if (!reg) return { success: false, error: 'Invalid document type' }

    const syncResult = await syncDynamicWorkflowApprovers(docId, docType)
    if (!syncResult.success) return syncResult

    const { data: step, error: stepErr } = await supabaseAdmin
      .from('document_approvals')
      .select('id, doc_id, doc_type, step_order, role_required, approver_id, status')
      .eq('id', stepId)
      .eq('doc_id', docId)
      .eq('doc_type', docType.toLowerCase())
      .maybeSingle()
    if (stepErr) throw stepErr
    if (!step) return { success: false, error: 'Approval step not found' }

    const { data: currentProfile, error: currentProfileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
    if (currentProfileErr) throw currentProfileErr

    const isDirectApproval = step.approver_id === session.user.id
    const canTestRemote = ['admin', 'it_staff'].includes(currentProfile?.role)
    const canTest = isDirectApproval || canTestRemote
    if (!canTest) return { success: false, error: 'Not authorized to test this approver PIN' }
    if (!step.approver_id) {
      return {
        success: false,
        error: 'Approval step has no approver_id after sync. Fix workflow approver mapping first.',
        step: {
          id: step.id,
          step_order: step.step_order,
          role_required: step.role_required,
          status: step.status,
          has_approver_id: false
        }
      }
    }

    const { data: approver, error: approverErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, role, signature_pin, pin_attempts, pin_locked_until')
      .eq('id', step.approver_id)
      .maybeSingle()
    if (approverErr) throw approverErr
    if (!approver) return { success: false, error: 'Approver profile not found' }

    const pinCheck = await verifyEmployeePIN(step.approver_id, pin)
    return {
      success: pinCheck.success,
      error: pinCheck.success ? null : pinCheck.error,
      step: {
        id: step.id,
        step_order: step.step_order,
        role_required: step.role_required,
        status: step.status,
        has_approver_id: Boolean(step.approver_id)
      },
      approver: {
        id: approver.id,
        full_name: approver.full_name,
        email: approver.email,
        role: approver.role,
        has_signature_pin: Boolean(approver.signature_pin),
        pin_attempts: approver.pin_attempts || 0,
        pin_locked_until: approver.pin_locked_until || null
      }
    }
  } catch (err) {
    console.error('diagnoseApprovalPin Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 🛠️ Record System Error Log
 */
export async function recordSystemError(category, message, metadata = {}) {
  try {
    const supabaseAdmin = getAdminClient()
    await supabaseAdmin.from('system_logs').insert({
      category,
      message,
      metadata,
      created_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('recordSystemError Failed:', err)
  }
}

/**
 * 🛡️ Unified Audit Logging System
 * Records activity to module-specific logs and prepares for a centralized audit table.
 */
export async function recordAuditLog({ docId, docType, action, details, userEmail, metadata = {} }) {
  try {
    const supabaseAdmin = getAdminClient()
    const type = docType.toLowerCase()
    
    // 1. Record to system_audit_logs (Centralized)
    const { error } = await supabaseAdmin.from('system_audit_logs').insert({
      doc_id: docId,
      doc_type: type,
      action: action,
      details: details,
      user_email: userEmail,
      metadata: metadata
    })

    if (error) {
      console.error('system_audit_logs Error:', error)
      // Fallback or secondary log could be here, but we prioritize the centralized one
    }

    // 2. Backward Compatibility: Record to Legacy Module Logs if needed
    const reg = WORKFLOW_DOC_REGISTRY[type]
    if (reg) {
      const table = type === 'checklist' ? 'checklist_logs' : 'incident_logs'
      const fullAction = details ? `${action} | ${details}` : action
      const legacyData = { action: fullAction, user_email: userEmail }
      if (type === 'checklist') legacyData.doc_id = docId; else legacyData.incident_id = docId;
      await supabaseAdmin.from(table).insert(legacyData).catch(e => console.warn('Legacy Logging Warning:', e))
    }

    return { success: true }
  } catch (err) {
    console.error('recordAuditLog Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 📧 [Phase 2] Helper: ส่งอีเมลแจ้งเตือนผู้อนุมัติ
 */
async function notifyApprover(approverId, docId, docType, docNo, title) {
  try {
    const supabaseAdmin = getAdminClient()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', approverId)
      .single()

    if (!profile?.email) return

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const link = `${baseUrl}/dashboard/${docType === 'incident' ? 'incidents' : 'checklist'}/${docId}`

    await sendEmail({
      to: profile.email,
      subject: `[Pending Approval] ${docNo} - ${title}`,
      html: `
        <div style="padding: 24px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">สวัสดีคุณ ${profile.full_name}</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            มีเอกสารรอการอนุมัติจากคุณในระบบ DOWA IT System
          </p>
          <div style="background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">เลขที่เอกสาร</p>
            <p style="margin: 4px 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 700;">${docNo}</p>
            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">หัวข้อ</p>
            <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 16px;">${title}</p>
          </div>
          <a href="${link}" style="display: inline-block; padding: 14px 28px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700;">
            ไปหน้าตรวจสอบและอนุมัติ
          </a>
        </div>
      `
    })
  } catch (err) {
    console.error('notifyApprover Error:', err)
  }
}

/**
 * 📋 Approval Audit Log
 * Returns ALL document_approvals rows (approved, pending, waiting) across both modules,
 * enriched with document details — one row per sequence step.
 * Used by the "ประวัติการอนุมัติ" tab in /dashboard/approvals.
 */
export async function getApprovalAuditLog({ limit = 200 } = {}) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    // 1. Fetch all approval steps with approver profile
    const { data: steps, error } = await supabaseAdmin
      .from('document_approvals')
      .select(`
        id, doc_id, doc_type, step_order, status,
        role_required, approver_id, action_at, comment,
        approver:user_profiles!document_approvals_approver_id_fkey(full_name, email)
      `)
      .order('action_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    if (!steps || steps.length === 0) return { data: [] }

    // 2. Collect doc IDs by type
    const incidentIds = [...new Set(steps.filter(s => s.doc_type === 'incident').map(s => s.doc_id))]
    const checklistIds = [...new Set(steps.filter(s => s.doc_type === 'checklist').map(s => s.doc_id))]

    // 3. Fetch document details in parallel
    const [incidentsRes, checklistsRes] = await Promise.all([
      incidentIds.length > 0
        ? supabaseAdmin
            .from('incidents')
            .select('id, case_number, title, reported_by, severity, reporter:user_profiles!incidents_reported_by_id_fkey(full_name)')
            .in('id', incidentIds)
        : Promise.resolve({ data: [] }),
      checklistIds.length > 0
        ? supabaseAdmin
            .from('checklist_docs')
            .select('id, freq_type, period_date')
            .in('id', checklistIds)
        : Promise.resolve({ data: [] }),
    ])

    const incidentMap = Object.fromEntries((incidentsRes.data || []).map(i => [i.id, i]))
    const checklistMap = Object.fromEntries((checklistsRes.data || []).map(c => [c.id, c]))

    // 4. Build unified rows — one row per step
    const rows = steps.map(step => {
      const statusLabel = { approved: 'อนุมัติแล้ว', pending: 'รออนุมัติ', waiting: 'รอลำดับก่อน' }
      const reg = WORKFLOW_DOC_REGISTRY[step.doc_type]
      if (!reg) return null

      if (step.doc_type === 'incident') {
        const inc = incidentMap[step.doc_id]
        if (!inc) return null
        return {
          id: step.id,
          category: 'Incident',
          docId: inc.id,
          docNo: inc[reg.no_field],
          subject: inc[reg.title_field],
          requester: inc.reporter?.full_name || inc.reported_by || '—',
          stepOrder: step.step_order,
          roleRequired: step.role_required,
          approverName: step.approver?.full_name || step.approver?.email || '—',
          status: step.status,
          statusLabel: statusLabel[step.status] || step.status,
          actionAt: step.action_at,
          comment: step.comment,
          link: `/dashboard/incidents/${inc.id}`,
          severity: inc.severity
        }
      } else {
        const chk = checklistMap[step.doc_id]
        if (!chk) return null
        return {
          id: step.id,
          category: 'Checklist',
          docId: chk.id,
          docNo: `CHK-${chk.period_date}-${chk.freq_type?.charAt(0) || '?'}`,
          subject: `IT Checklist (${chk.freq_type}) — ${chk.period_date}`,
          requester: '—',
          stepOrder: step.step_order,
          roleRequired: step.role_required,
          approverName: step.approver?.full_name || step.approver?.email || '—',
          status: step.status,
          statusLabel: statusLabel[step.status] || step.status,
          actionAt: step.action_at,
          comment: step.comment,
          link: `/dashboard/checklist/${chk.id}`,
        }
      }
    }).filter(Boolean)

    return { data: rows }
  } catch (err) {
    console.error('getApprovalAuditLog Error:', err)
    return { error: err.message }
  }
}

export async function getUnifiedPendingApprovals() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    // 1. Get User Profile ID
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch Pending Approval Steps first (The source of truth)
    // Refined Query: Strict RBAC — split into 2 queries for reliability
    // 1. If a step has a specific approver_id, ONLY that user sees it.
    // 2. If approver_id is null, anyone with the matching role sees it.
    const [byIdRes, byRoleRes] = await Promise.all([
      supabaseAdmin.from('document_approvals').select('*').eq('status', 'pending').eq('approver_id', profile.id),
      supabaseAdmin.from('document_approvals').select('*').eq('status', 'pending').is('approver_id', null).eq('role_required', profile.role)
    ])
    console.log('[DEBUG] profile.id:', profile.id, 'profile.role:', profile.role)
    console.log('[DEBUG] byId count:', byIdRes.data?.length, 'byRole count:', byRoleRes.data?.length)
    console.log('[DEBUG] byId data:', byIdRes.data)
    const pendingSteps = [...(byIdRes.data || []), ...(byRoleRes.data || [])]

    if (!pendingSteps || pendingSteps.length === 0) return { data: [] }

    const checklistIds = pendingSteps.filter(s => s.doc_type === 'checklist').map(s => s.doc_id)
    const incidentIds = pendingSteps.filter(s => s.doc_type === 'incident').map(s => s.doc_id)

    // 3. Fetch Document Details
    const [checklistsRes, incidentsRes] = await Promise.all([
      checklistIds.length > 0 
        ? supabaseAdmin.from('checklist_docs').select('id, freq_type, period_date, status, created_by').in('id', checklistIds)
        : Promise.resolve({ data: [] }),
      incidentIds.length > 0
        ? supabaseAdmin.from('incidents').select('id, case_number, title, status, created_at, severity, reported_by').in('id', incidentIds)
        : Promise.resolve({ data: [] })
    ])

    console.log('[DEBUG] incidentIds:', incidentIds)
    console.log('[DEBUG] incidentsRes:', incidentsRes.data)
    const checklistMap = Object.fromEntries((checklistsRes.data || []).map(c => [c.id, c]))
    const incidentMap = Object.fromEntries((incidentsRes.data || []).map(i => [i.id, i]))

    // 4. Transform into Unified Format using pendingSteps as the driver
    const unified = pendingSteps.map(step => {
      if (step.doc_type === 'checklist') {
        const c = checklistMap[step.doc_id]
        if (!c) return null
        return {
          id: c.id,
          category: 'Checklist',
          type: c.freq_type,
          docNo: `CHK-${c.period_date}-${c.freq_type.charAt(0)}`,
          subject: `IT Checklist (${c.freq_type}) - ${c.period_date}`,
          requestDate: c.period_date,
          requester: c.created_by || 'System',
          link: `/dashboard/checklist/${c.id}`
        }
      } else {
        const i = incidentMap[step.doc_id]
        if (!i) return null
        return {
          id: i.id,
          category: 'Incident',
          type: 'Ticket',
          docNo: i.case_number,
          subject: i.title,
          requestDate: i.created_at?.split('T')[0] || 'N/A',
          requester: i.user_profiles?.full_name || 'Unknown',
          link: `/dashboard/incidents/${i.id}`,
          severity: i.severity
        }
      }
    }).filter(Boolean)

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

    const supabaseAdmin = getAdminClient()

    // 1. Get User Profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch My Pending Checklists (Sent by me, still pending) — UUID-based
    const { data: checklists } = await supabaseAdmin
      .from('checklist_docs')
      .select(`id, freq_type, period_date, status, workflow_status, created_by, created_by_id, assigned_approver_id`)
      .in('workflow_status', ['pending', 'PENDING'])
      .eq('created_by_id', profile.id)

    // 3. Fetch My Pending Incidents (Sent by me OR Reported by me, still pending approval) — UUID-based
    const { data: incidents } = await supabaseAdmin
      .from('incidents')
      .select(`id, case_number, title, status, created_at, reported_by, reported_by_id, assigned_to`)
      .ilike('status', 'Pending Approval')
      .eq('reported_by_id', profile.id)

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

export async function getSystemLogs(type = 'audit', { page = 0, limit = 20 } = {}) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const from = page * limit
    const to = (page + 1) * limit - 1

    if (type === 'login') {
      const { data, error, count } = await supabaseAdmin
        .from('login_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error

      // Map names for login logs
      const emails = [...new Set(data.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = data.map(l => ({
        ...l,
        full_name: nameMap[l.user_email] || l.user_email
      }))

      return { data: mapped, count }
    }

    if (type === 'audit') {
      const { data, error, count } = await supabaseAdmin
        .from('system_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error

      // Fetch names for all emails
      const emails = [...new Set(data.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = data.map(l => ({
        ...l,
        category: l.doc_type === 'checklist' ? 'Checklist' : (l.doc_type === 'incident' ? 'Incident' : l.doc_type),
        full_name: nameMap[l.user_email] || l.user_email,
        docNo: l.metadata?.doc_no || '—'
      }))

      return { data: mapped, count }
    }

    if (type === 'approval') {
      const { data, error, count } = await supabaseAdmin
        .from('system_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const emails = [...new Set(data.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      // Fetch current status for all docs in this page
      const checklistIds = data.filter(l => l.doc_type === 'checklist').map(l => l.doc_id)
      const incidentIds = data.filter(l => l.doc_type === 'incident').map(l => l.doc_id)
      
      const [chkRes, incRes] = await Promise.all([
        checklistIds.length > 0 ? supabaseAdmin.from('checklist_docs').select('id, status, workflow_status').in('id', checklistIds) : { data: [] },
        incidentIds.length > 0 ? supabaseAdmin.from('incidents').select('id, status').in('id', incidentIds) : { data: [] }
      ])
      
      const chkStatusMap = Object.fromEntries(chkRes.data?.map(d => [d.id, d]) || [])
      const incStatusMap = Object.fromEntries(incRes.data?.map(d => [d.id, d]) || [])

      const mapped = data.map(l => {
        const cur = l.doc_type === 'checklist' ? chkStatusMap[l.doc_id] : incStatusMap[l.doc_id]
        return {
          id: l.id,
          doc_id: l.doc_id,
          category: l.doc_type === 'checklist' ? 'Checklist' : 'Incident',
          docNo: l.metadata?.doc_no || '—',
          subject: l.details || l.action,
          action: l.action,
          timestamp: l.created_at,
          user: nameMap[l.user_email] || l.user_email,
          current_status: cur?.status,
          current_workflow_status: l.doc_type === 'checklist' ? cur?.workflow_status : (cur?.status === 'Pending Approval' ? 'pending' : 'other')
        }
      })

      return { data: mapped, count }
    }

    if (type === 'system') {
      const { data, error, count } = await supabaseAdmin
        .from('system_logs')
        .select('*', { count: 'exact' })
        .eq('category', 'error')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { data: data || [], count }
    }

    return { data: [], count: 0 }
  } catch (err) {
    console.error('getSystemLogs Error:', err)
    return { error: err.message }
  }
}

/**
 * 🔏 Auto-consume signatures from Resolve dialog into document_approvals steps.
 * 🔏 Phase 1: Apply initial signatures to workflow steps (e.g., during Resolve)
 */
async function applySignaturesToWorkflow(docId, initialSignatures, submitterEmail, reporterPIN = null) {
  if (!initialSignatures) return
  const supabaseAdmin = getAdminClient()

  // Fetch all steps for this doc ordered by step_order
  const { data: steps } = await supabaseAdmin
    .from('document_approvals')
    .select('*')
    .eq('doc_id', docId)
    .order('step_order')

  if (!steps || steps.length === 0) return

  // Map step_order to signature data
  const sigMap = {
    1: initialSignatures.it,       // IT Officer
    2: initialSignatures.reporter,  // Reporter / ผู้แจ้ง
    3: initialSignatures.manager,   // Manager (High severity only)
  }

  const now = new Date().toISOString()
  let lastApprovedOrder = 0

  for (const step of steps) {
    const sigData = sigMap[step.step_order]
    
    // 🛡️ Step 1 (IT Officer) is always approved during Resolve (Log-only)
    if (step.step_order === 1) {
      const { error: updateErr } = await supabaseAdmin
        .from('document_approvals')
        .update({
          status: 'approved',
          approver_id: sigData?.userId || null,
          signature_data: null, 
          action_at: now,
          comment: '(Logged & Verified during Resolve)'
        })
        .eq('id', step.id)

      if (updateErr) throw updateErr

      await recordLog(
        docId, 'incident',
        'Approved',
        `อนุมัติขั้นที่ 1 | ${sigData?.name || 'IT Officer'} (Auto-approved during Resolve)`,
        submitterEmail
      )
      lastApprovedOrder = 1
      continue
    }

    // 🛡️ Step 2 (Reporter) - Optional Auto-approval via PIN
    if (step.step_order === 2) {
      if (reporterPIN) {
        const pinCheck = await verifyEmployeePIN(sigData?.userId, reporterPIN)
        if (!pinCheck.success) {
          throw new Error('รหัส PIN ของผู้แจ้งไม่ถูกต้อง')
        }

        const { error: updateErr } = await supabaseAdmin
          .from('document_approvals')
          .update({
            status: 'approved',
            approver_id: sigData?.userId || null,
            signature_data: null, // Log-based
            action_at: now,
            comment: '(Face-to-face approval via PIN during Resolve)'
          })
          .eq('id', step.id)

        if (updateErr) throw updateErr

        await recordLog(
          docId, 'incident',
          'Approved',
          `อนุมัติขั้นที่ 2 | ${sigData?.name || 'Reporter'} (Verified by PIN during Resolve)`,
          submitterEmail
        )
        lastApprovedOrder = 2
        continue
      } else {
        // No PIN provided, so the reporter must approve manually later.
        // We STOP auto-approving here.
        break
      }
    }

    // Step 3 (Manager) - Usually not auto-approved during Resolve unless explicitly handled
    break
  }

  // Unlock the NEXT pending step if it exists
  const nextStep = steps.find(s => s.step_order === lastApprovedOrder + 1)
  if (nextStep && nextStep.status === 'waiting') {
    await supabaseAdmin
      .from('document_approvals')
      .update({ status: 'pending' })
      .eq('id', nextStep.id)
  }
}

export async function submitRequest(docId, targetType, triggerKey, userEmail, initialSignatures = null, reporterPIN = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

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

    const reg = WORKFLOW_DOC_REGISTRY[targetType]
    if (!reg) return { error: 'Invalid document type' }

    // 2. Generate Steps in the new table (Unified Workflow)
    const { success, autoApproved } = await generateWorkflowSteps(docId, targetType, reg.condition_key, triggerKey, config?.primary_approver_id)
    let finalAutoApprove = autoApproved

    if (!success) throw new Error('Failed to generate workflow steps')

    // 3. Update Document Status
    const { error } = await supabaseAdmin
      .from(reg.table)
      .update({
        [reg.workflow_status_field]: autoApproved ? 'approved' : 'pending',
        [reg.status_field]: autoApproved ? 'Closed' : 'Pending Approval',
        assigned_approver_id: config?.primary_approver_id || null
      })
      .eq('id', docId)
    
    if (error) throw error

    await recordLog(docId, targetType, autoApproved ? 'Auto-Approved' : 'Submitted', autoApproved 
      ? 'ระบบอนุมัติงานให้อัตโนมัติตามการตั้งค่า (No approval steps required)' 
      : `ส่งเอกสารเพื่อขออนุมัติ (ผู้อนุมัติหลัก: ${approverName})`, userEmail)

    // 🔏 PHASE 1 FIX: Apply signatures from Resolve dialog into workflow steps immediately
    if (targetType === 'incident' && initialSignatures) {
      await applySignaturesToWorkflow(docId, initialSignatures, userEmail, reporterPIN)

      // Re-check: if all steps are now approved, close the document
      const { data: allSteps } = await supabaseAdmin
        .from('document_approvals')
        .select('status')
        .eq('doc_id', docId)

      const allApproved = allSteps && allSteps.length > 0 && allSteps.every(s => s.status === 'approved')
      if (allApproved) {
        await supabaseAdmin
          .from('incidents')
          .update({ status: 'Closed', workflow_status: 'approved' })
          .eq('id', docId)
        await recordLog(docId, 'incident', 'Auto-Closed', 'ปิดเคสอัตโนมัติ — ลายเซ็นครบทุกขั้นตอน (Resolve)', userEmail)
        await onDocumentFinalApproval(docId, 'incident')
        return { success: true, autoApproved: true, allSigned: true }
      }
    }

    // 🛡️ CRITICAL: Handle cross-module sync if auto-approved
    if (finalAutoApprove) {
      await onDocumentFinalApproval(docId, targetType)
    }

    // 📧 [Phase 2] Notify Approver
    if (!finalAutoApprove && config?.primary_approver_id) {
      const { data: docData } = await supabaseAdmin.from(reg.table).select(`${reg.no_field}, ${reg.title_field}`).eq('id', docId).single()
      if (docData) {
        await notifyApprover(
          config.primary_approver_id, 
          docId, 
          targetType, 
          docData[reg.no_field], 
          docData[reg.title_field]
        )
      }
    }

    return { success: true, autoApproved: finalAutoApprove }
  } catch (err) {
    console.error('submitRequest Error:', err)
    return { success: false, error: err.message }
  }
}

// ==========================================
// UNIFIED WORKFLOW ENGINE FUNCTIONS
// ==========================================

export async function generateWorkflowSteps(docId, targetType, configKey, triggerKey, initialApproverId = null) {
  try {
    const supabaseAdmin = getAdminClient()
    
    // Normalize triggerKey to Integer for routing (Scalable Engine Upgrade)
    const normalizedValue = getMappedWorkflowValue(configKey, triggerKey)

    // 1. Get configs for this doc type
    const { data: configs } = await supabaseAdmin
      .from('workflow_configs')
      .select('*')
      .eq('target_type', targetType)
      .eq('condition_key', configKey)
      .eq('condition_value', normalizedValue)
      .eq('is_active', true)
      .order('step_order')

    if (!configs || configs.length === 0) return { success: true, autoApproved: true }

    // 🛡️ [NEW] Support JSONB Steps from UI Settings
    // หากในแถวแรกมีคอลัมน์ 'steps' ที่เป็น Array ให้ใช้ข้อมูลจากตรงนั้นแทนการใช้ Row-per-step
    let stepsToInsert = []
    const masterConfig = configs[0]

    if (Array.isArray(masterConfig.steps) && masterConfig.steps.length > 0) {
      stepsToInsert = masterConfig.steps.map((s, idx) => ({
        doc_id: docId,
        doc_type: targetType,
        step_order: s.step_order || (idx + 1),
        status: idx === 0 ? 'pending' : 'waiting',
        role_required: s.role_required,
        approver_id: s.approver_id || null
      }))
    } else {
      // Legacy Row-per-step logic
      stepsToInsert = configs.map((c, idx) => ({
        doc_id: docId,
        doc_type: targetType,
        step_order: c.step_order,
        status: idx === 0 ? 'pending' : 'waiting',
        role_required: c.role_required,
        approver_id: idx === 0 ? initialApproverId : null
      }))
    }

    // 2. [Phase 2 Cleanup] Remove any existing steps to prevent duplicates/conflicts
    await supabaseAdmin
      .from('document_approvals')
      .delete()
      .eq('doc_id', docId)
      .eq('doc_type', targetType)

    // 3. [NEW] Dynamic Role Resolution (e.g., 'reporter')
    // If any step requires the reporter, fetch the source document and inject their ID
    if (stepsToInsert.some(s => s.role_required === 'reporter')) {
      const reg = WORKFLOW_DOC_REGISTRY[targetType]
      if (reg) {
        const { data: doc } = await supabaseAdmin
          .from(reg.table)
          .select(`${reg.no_field}, reported_by_id, created_by`)
          .eq('id', docId)
          .single()
        
        if (doc) {
          const reporterId = await resolveDynamicWorkflowApproverId({ role_required: 'reporter' }, doc)
          stepsToInsert = stepsToInsert.map(s => 
            s.role_required === 'reporter' ? { ...s, approver_id: reporterId } : s
          )
        }
      }
    }

    // 4. Create actual approval steps for this document
    const { error } = await supabaseAdmin.from('document_approvals').insert(stepsToInsert)
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
        user_profiles!document_approvals_approver_id_fkey(full_name, email, role)
      `)
      .eq('doc_id', docId)
      .order('step_order')

    if (error) throw error
    return { data: data, error: null }
  } catch (err) {
    console.error('getDocumentWorkflowStatus Error:', err)
    return { data: [], error: err.message }
  }
}

/**
 * 🔍 [Phase 2] Preview potential workflow steps before generation
 */
export async function getPotentialWorkflowSteps(targetType, triggerKey) {
  try {
    const supabaseAdmin = getAdminClient()
    const reg = WORKFLOW_DOC_REGISTRY[targetType]
    if (!reg) return { data: [] }

    const normalizedValue = getMappedWorkflowValue(reg.condition_key, triggerKey)

    const { data: configs } = await supabaseAdmin
      .from('workflow_configs')
      .select('*')
      .eq('target_type', targetType)
      .eq('condition_key', reg.condition_key)
      .eq('condition_value', normalizedValue)
      .eq('is_active', true)
      .order('step_order')

    if (!configs || configs.length === 0) return { data: [] }

    const masterConfig = configs[0]
    let previewSteps = []

    if (Array.isArray(masterConfig.steps) && masterConfig.steps.length > 0) {
      // 🛡️ [NEW] Support JSONB Steps from UI Settings for Preview
      previewSteps = masterConfig.steps.map((s, idx) => ({
        id: `preview-${idx}`,
        step_order: s.step_order || (idx + 1),
        role_required: s.role_required,
        approver_id: s.approver_id || null,
        status: 'waiting',
        is_preview: true
      }))
    } else {
      // Legacy Row-per-step logic
      previewSteps = configs.map(c => ({
        id: `preview-${c.id}`,
        step_order: c.step_order,
        role_required: c.role_required,
        approver_id: c.approver_id || null,
        status: 'waiting',
        is_preview: true
      }))
    }

    // Join with user_profiles for names if approver_id exists
    const approverIds = previewSteps.map(s => s.approver_id).filter(id => id)
    let userMap = {}
    if (approverIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role')
        .in('id', approverIds)
      if (users) {
        users.forEach(u => userMap[u.id] = u)
      }
    }

    return { 
      data: previewSteps.map(s => ({
        ...s,
        user_profiles: s.approver_id ? userMap[s.approver_id] : null
      }))
    }
  } catch (err) {
    console.error('getPotentialWorkflowSteps Error:', err)
    return { data: [] }
  }
}

export async function rejectDocumentWorkflow(docId, docType, reason) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const reg = WORKFLOW_DOC_REGISTRY[docType.toLowerCase()]
    if (!reg) return { error: 'Invalid document type' }

    // 1. Update Main Table
    const { error: updateErr } = await supabaseAdmin
      .from(reg.table)
      .update({
        [reg.workflow_status_field]: 'draft',
        [reg.status_field]: docType.toLowerCase() === 'incident' ? 'In Progress' : 'Open', // Return to editing state
        assigned_approver_id: null
      })
      .eq('id', docId)

    if (updateErr) throw updateErr

    // 2. Mark current pending steps as rejected
    await supabaseAdmin
      .from('document_approvals')
      .update({ status: 'rejected', comment: `Rejected: ${reason}` })
      .eq('doc_id', docId)
      .eq('status', 'pending')

    // 3. Record Log
    await recordLog(docId, docType.toLowerCase(), 'Rejected', `ตีกลับเอกสาร | เหตุผล: ${reason}`, session.user.email)

    return { success: true }
  } catch (err) {
    console.error('rejectDocumentWorkflow Error:', err)
    return { error: err.message }
  }
}

export async function submitApprovalStep(docId, docType, stepId, signatureData, comment = '', pin = null, overrideApproverId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    const syncResult = await syncDynamicWorkflowApprovers(docId, docType)
    if (!syncResult.success) return { error: syncResult.error }
     
    // 1. Get current step info
    const { data: currentStep } = await supabaseAdmin
      .from('document_approvals')
      .select('*')
      .eq('id', stepId)
      .single()

    if (!currentStep || currentStep.status !== 'pending') return { error: 'Step not ready for approval' }

    // 🛡️ SECURITY: PIN Verification Enforcement
    const actualApproverId = currentStep.approver_id || overrideApproverId || session.user.id
    const isDirectApproval = actualApproverId === session.user.id

    // หากไม่ใช่เจ้าตัวเซ็นเอง (Remote Approval) "ต้อง" มี PIN และต้องตรวจผ่านเสมอ
    if (!isDirectApproval) {
      if (!pin) return { error: 'การอนุมัติแทนจำเป็นต้องระบุรหัส PIN ของผู้อนุมัติ' }
      const pinCheck = await verifyEmployeePIN(actualApproverId, pin)
      if (!pinCheck.success) return { error: pinCheck.error || 'รหัส PIN ของผู้อนุมัติไม่ถูกต้อง' }
    } else {
      // กรณีเซ็นเอง หากมี PIN ส่งมาก็ตรวจ (เพื่อความปลอดภัยเสริม) 
      if (pin) {
        const pinCheck = await verifyEmployeePIN(actualApproverId, pin)
        if (!pinCheck.success) return { error: pinCheck.error || 'รหัส PIN ไม่ถูกต้อง' }
      }
    }

    // 2. Execute Transactional Approval via RPC
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('full_name, email').eq('id', actualApproverId).single()
    const fullName = profile?.full_name || (overrideApproverId ? 'Unknown Approver' : session.user.email)
    const email = profile?.email || session.user.email
    
    const isRemote = !isDirectApproval
    const logDetails = `อนุมัติโดย: ${fullName} (${email})${isRemote ? ' [Verify by PIN]' : ''}${comment ? ` | Note: ${comment}` : ''}`

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('handle_approval_step', {
      p_doc_id: docId,
      p_doc_type: docType,
      p_step_id: stepId,
      p_approver_id: actualApproverId,
      p_user_email: session.user.email,
      p_sig_data: signatureData,
      p_comment: comment,
      p_is_remote: isRemote,
      p_log_details: logDetails
    })

    if (rpcErr) throw rpcErr
    if (!rpcRes.success) return { error: rpcRes.error }

    // 3. Cross-module sync if final
    if (rpcRes.is_final) {
      await onDocumentFinalApproval(docId, docType)
    } else {
      // 📧 [Phase 2] Notify Next Approver
      const { data: nextStep } = await supabaseAdmin
        .from('document_approvals')
        .select('*')
        .eq('doc_id', docId)
        .eq('status', 'pending')
        .order('step_order')
        .limit(1)
        .maybeSingle()

      if (nextStep && nextStep.approver_id) {
        const reg = WORKFLOW_DOC_REGISTRY[docType.toLowerCase()]
        const { data: docData } = await supabaseAdmin.from(reg.table).select(`${reg.no_field}, ${reg.title_field}`).eq('id', docId).single()
        if (docData) {
          await notifyApprover(
            nextStep.approver_id,
            docId,
            docType.toLowerCase(),
            docData[reg.no_field],
            docData[reg.title_field]
          )
        }
      }
    }

    return { success: true, isFinal: rpcRes.is_final }
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
          const { data: p } = await supabaseAdmin.from('user_profiles').select('id').eq('email', approverId).limit(1).maybeSingle()
          if (p) approverId = p.id
      }

      // 🛡️ Determine role_required from config if not approved
      let roleReq = 'admin' // Default fallback
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

export async function resetDocumentWorkflow(docId, docType) {
  try {
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin
      .from('document_approvals')
      .delete()
      .eq('doc_id', docId)
      .eq('doc_type', docType.toLowerCase())
    
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('resetDocumentWorkflow Error:', err)
    return { error: err.message }
  }
}

export async function adminResetWorkflow(docId, docType, password) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'internal') return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    // 1. Verify Admin Role
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') return { error: 'Access Denied: Administrator role required.' }

    // 2. Verify Password (by trying to sign in with a fresh client)
    const { error: authError } = await createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      .auth.signInWithPassword({
        email: session.user.email,
        password: password
      })

    if (authError) return { error: 'รหัสผ่านไม่ถูกต้อง การยืนยันตัวตนล้มเหลว' }

    // 3. Reset Workflow in Main Table
    const reg = WORKFLOW_DOC_REGISTRY[docType.toLowerCase()]
    if (!reg) return { error: 'Invalid document type' }

    const updateData = {
      [reg.workflow_status_field]: null,
      [reg.status_field]: 'Open',
      assigned_approver_id: null,
      approved_by: null,
      approved_at: null
    }

    const { error: resetError } = await supabaseAdmin
      .from(reg.table)
      .update(updateData)
      .eq('id', docId)

    if (resetError) throw resetError

    // 4. Reset document_approvals table
    await resetDocumentWorkflow(docId, docType)

    // 5. Record Log
    await recordLog(docId, docType.toLowerCase(), 'Admin Override', `ยกเลิกการอนุมัติ (Workflow Reset) โดย ${profile.full_name} ผ่านหน้าจอ Approval Logs`, session.user.email)

    return { success: true }
  } catch (err) {
    console.error('adminResetWorkflow Error:', err)
    return { error: err.message }
  }
}

/**
 * ⚙️ Update Approval Configuration (Bypass RLS for Admins)
 * Uses Service Role to update the primary approver for a specific frequency/type.
 */
export async function updateApprovalConfig(freqType, approverId) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'internal') return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    // 1. Verify Admin Role (Security Check)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { error: 'Access Denied: You do not have permission to manage approval flows.' }
    }

    // 2. Perform Upsert via Admin Client
    const targetType = freqType === 'Incident' ? 'incident' : 'checklist'
    const category = freqType === 'Incident' ? 'high_priority' : 'general'
    
    const { error: upsertError } = await supabaseAdmin
      .from('approval_configs')
      .upsert({ 
        freq_type: freqType, 
        primary_approver_id: approverId || null,
        target_type: targetType,
        category: category,
        allowed_roles: ['admin', 'it_staff', 'approver']
      }, { onConflict: 'freq_type, category' })

    if (upsertError) throw upsertError

    // 3. Record Audit Log
    const approverName = approverId ? 'Specific User' : 'System Auto-Approve'
    await recordLog(
      '00000000-0000-0000-0000-000000000000', // System-level config ID placeholder
      'approval_config',
      'Updated',
      `ปรับปรุงผู้อนุมัติหลักสำหรับ ${freqType} เป็น ${approverName}`,
      session.user.email
    )

    return { success: true }
  } catch (err) {
    console.error('updateApprovalConfig Error:', err)
    return { error: err.message }
  }
}
