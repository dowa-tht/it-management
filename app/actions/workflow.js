'use server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getCurrentUserSession } from './user'
import { verifyEmployeePIN } from './users'
import { recordEntityAuditLog } from './audit'
import { WORKFLOW_DOC_REGISTRY, getMappedWorkflowValue } from '@/lib/workflowRegistry'
import { sendEmail } from '@/lib/resend'
import { normalizeRole } from '@/lib/auth'
import { deriveIncidentCancelVerificationPolicy } from '@/lib/incidentCancelVerificationPolicy'

const getAdminClient = getSupabaseAdmin
const INCIDENT_EMAIL_OTP_TTL_MINUTES = 30
const INCIDENT_EMAIL_OTP_COOLDOWN_SECONDS = 60

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

function maskEmail(email) {
  const value = normalizeEmail(email)
  const [local, domain] = value.split('@')
  if (!local || !domain) return value
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

async function requestIncidentEmailOtp(supabaseAdmin, reporterEmail, reporterName = 'ผู้แจ้ง', purpose = 'cancel') {
  const email = normalizeEmail(reporterEmail)
  if (!email) return { success: false, error: 'ไม่พบอีเมลผู้แจ้งสำหรับส่ง OTP' }

  const now = new Date()
  const cooldownBound = new Date(now.getTime() - INCIDENT_EMAIL_OTP_COOLDOWN_SECONDS * 1000).toISOString()
  const { data: existing } = await supabaseAdmin
    .from('email_otps')
    .select('created_at')
    .eq('email', email)
    .maybeSingle()

  if (existing?.created_at && new Date(existing.created_at).toISOString() > cooldownBound) {
    return { success: false, error: `กรุณารอ ${INCIDENT_EMAIL_OTP_COOLDOWN_SECONDS} วินาทีก่อนขอ OTP ใหม่` }
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(now.getTime() + INCIDENT_EMAIL_OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const { error: upsertErr } = await supabaseAdmin
    .from('email_otps')
    .upsert({
      email,
      otp_code: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      created_at: now.toISOString(),
    }, { onConflict: 'email' })

  if (upsertErr) return { success: false, error: upsertErr.message }

  const isApprovalPurpose = purpose === 'approval'
  const mailSubject = isApprovalPurpose
    ? '[DOWA IT] รหัส OTP สำหรับยืนยัน Remote Approve Incident'
    : '[DOWA IT] รหัส OTP สำหรับยืนยันการยกเลิก Incident'
  const mailTitle = isApprovalPurpose ? 'ยืนยัน Remote Approve Incident' : 'ยืนยันการยกเลิก Incident'
  const mailDescription = isApprovalPurpose
    ? 'กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยันการอนุมัติแทน:'
    : 'กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยัน:'

  const mailResult = await sendEmail({
    to: email,
    subject: mailSubject,
    html: `
      <div style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h3 style="margin-top: 0; color: #0f172a;">${mailTitle}</h3>
          <p style="font-size: 14px; color: #334155;">สวัสดีคุณ <strong>${reporterName}</strong></p>
          <p style="font-size: 14px; color: #334155;">${mailDescription}</p>
          <div style="text-align:center; margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 10px;">
            <span style="font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #1d4ed8;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #64748b;">รหัสนี้มีอายุ ${INCIDENT_EMAIL_OTP_TTL_MINUTES} นาที</p>
        </div>
      </div>
    `,
  })

  if (mailResult?.error) return { success: false, error: 'ไม่สามารถส่ง OTP ไปยังอีเมลผู้แจ้งได้' }
  return { success: true, email, maskedEmail: maskEmail(email) }
}

async function verifyIncidentEmailOtp(supabaseAdmin, reporterEmail, otp) {
  const email = normalizeEmail(reporterEmail)
  const code = String(otp || '').trim()
  if (!email) return { success: false, error: 'ไม่พบอีเมลผู้แจ้งสำหรับตรวจสอบ OTP' }
  if (!code) return { success: false, error: 'กรุณากรอกรหัส OTP' }

  const { data: row } = await supabaseAdmin
    .from('email_otps')
    .select('email, otp_code, expires_at, attempts')
    .eq('email', email)
    .maybeSingle()

  if (!row) return { success: false, error: 'ไม่พบคำขอ OTP สำหรับอีเมลนี้' }
  if ((row.attempts || 0) >= 5) return { success: false, error: 'กรอกรหัสผิดเกินกำหนด กรุณาขอ OTP ใหม่' }
  if (!row.otp_code || row.otp_code !== code) {
    await supabaseAdmin.from('email_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('email', email)
    return { success: false, error: 'รหัส OTP ไม่ถูกต้อง' }
  }
  if (new Date(row.expires_at) < new Date()) return { success: false, error: 'รหัส OTP หมดอายุแล้ว' }

  await supabaseAdmin.from('email_otps').update({ otp_code: null, attempts: 0 }).eq('email', email)
  return { success: true, email }
}

async function getPendingApprovalPauseReasonId(supabaseAdmin) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('master_data')
    .select('id')
    .eq('type', 'sla_exclusion_reason')
    .ilike('value', 'Pending Approval')
    .limit(1)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (existing?.id) return existing.id

  const { data: maxRow, error: maxErr } = await supabaseAdmin
    .from('master_data')
    .select('sort_order')
    .eq('type', 'sla_exclusion_reason')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxErr) throw maxErr

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('master_data')
    .insert({
      type: 'sla_exclusion_reason',
      value: 'Pending Approval',
      is_active: true,
      sort_order: (maxRow?.sort_order || 0) + 1,
    })
    .select('id')
    .single()

  if (insertErr) throw insertErr
  return inserted?.id || null
}

async function openIncidentSlaPauseWindow(supabaseAdmin, incidentId) {
  if (!incidentId) return

  const { data: active, error: activeErr } = await supabaseAdmin
    .from('incident_exclusions')
    .select('id')
    .eq('incident_id', incidentId)
    .is('end_time', null)
    .limit(1)
    .maybeSingle()

  if (activeErr) throw activeErr
  if (active?.id) return

  const reasonId = await getPendingApprovalPauseReasonId(supabaseAdmin)

  const { error: insertErr } = await supabaseAdmin.from('incident_exclusions').insert({
    incident_id: incidentId,
    reason_id: reasonId,
    start_time: new Date().toISOString(),
    end_time: null,
    notes: 'System pause: Pending Approval',
  })

  if (insertErr) throw insertErr
}

async function transitionIncidentPauseToPendingApproval(supabaseAdmin, incidentId) {
  if (!incidentId) return { closedCount: 0, opened: false, at: null }

  const nowIso = new Date().toISOString()
  const reasonId = await getPendingApprovalPauseReasonId(supabaseAdmin)

  const { data: activeRows, error: activeErr } = await supabaseAdmin
    .from('incident_exclusions')
    .select('id')
    .eq('incident_id', incidentId)
    .is('end_time', null)

  if (activeErr) throw activeErr

  let closedCount = 0
  if (activeRows && activeRows.length > 0) {
    const { error: closeErr } = await supabaseAdmin
      .from('incident_exclusions')
      .update({ end_time: nowIso })
      .eq('incident_id', incidentId)
      .is('end_time', null)
    if (closeErr) throw closeErr
    closedCount = activeRows.length
  }

  const { error: openErr } = await supabaseAdmin.from('incident_exclusions').insert({
    incident_id: incidentId,
    reason_id: reasonId,
    start_time: nowIso,
    end_time: null,
    notes: 'System pause: Pending Approval',
  })
  if (openErr) throw openErr

  return { closedCount, opened: true, at: nowIso }
}

async function closeIncidentSlaPauseWindow(supabaseAdmin, incidentId) {
  if (!incidentId) return
  const { error: closeErr } = await supabaseAdmin
    .from('incident_exclusions')
    .update({ end_time: new Date().toISOString() })
    .eq('incident_id', incidentId)
    .is('end_time', null)

  if (closeErr) throw closeErr
}

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
  const docType = String(step?.doc_type || '').toLowerCase()
  if (step.role_required === 'reporter') {
    // Incident standard: reporter must map from reported_by_id only.
    // If external reporter (no account), approver_id must stay null and use OTP in remote approve.
    if (docType === 'incident') {
      return doc?.reported_by_id || null
    }
    // Checklist/backward-compat fallback
    return doc?.reported_by_id || doc?.created_by_id || null
  }
  if (step.role_required === 'creator') {
    // 🕵️ Support explicit 'creator' role for incidents (created_by_id) 
    // Fallback to reported_by_id for backward compatibility if created_by_id isn't populated
    return doc?.created_by_id || doc?.reported_by_id || null
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
      .select('*')
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
      const resolvedApproverId = await resolveDynamicWorkflowApproverId({ ...step, doc_type: docType.toLowerCase() }, doc)
      if (docType.toLowerCase() === 'incident' && step.role_required === 'reporter' && !doc?.reported_by_id && step.approver_id) {
        await recordLog(
          docId,
          'incident',
          'Workflow Reporter Guard',
          `ระบบรีเซ็ต approver_id ของ Reporter step จาก ${step.approver_id} เป็น null (External Reporter)` ,
          'system@workflow.internal'
        )
      }
      if (resolvedApproverId && resolvedApproverId !== step.approver_id) {
        const { error: updateErr } = await supabaseAdmin
          .from('document_approvals')
          .update({ approver_id: resolvedApproverId })
          .eq('id', step.id)
        if (updateErr) throw updateErr
      } else if (!resolvedApproverId && step.approver_id && step.role_required === 'reporter' && docType.toLowerCase() === 'incident' && !doc?.reported_by_id) {
        const { error: clearErr } = await supabaseAdmin
          .from('document_approvals')
          .update({ approver_id: null })
          .eq('id', step.id)
        if (clearErr) throw clearErr
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
      category: 'error',
      action: category, // Using category as the action title (e.g., 'Workflow', 'Auth')
      details: message,
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
    const auditMetadata = { ...(metadata || {}) }
    
    // 0. Resolve doc_no if missing
    if (!auditMetadata.doc_no && docId && docType) {
      const reg = WORKFLOW_DOC_REGISTRY[type]
      if (reg) {
        const { data: doc } = await supabaseAdmin
          .from(reg.table)
          .select(reg.no_field)
          .eq('id', docId)
          .single()
        
        if (doc) {
          if (type === 'checklist') {
            // For checklist, generate readable ID if no_field is just ID
            const { data: c } = await supabaseAdmin.from('checklist_docs').select('freq_type, period_date').eq('id', docId).single()
            if (c) auditMetadata.doc_no = `CHK-${c.period_date}-${c.freq_type?.charAt(0) || '?'}`
          } else {
            auditMetadata.doc_no = doc[reg.no_field]
          }
        }
      }
    }

    // 1. Record to system_audit_logs (Centralized)
    const auditResult = await recordEntityAuditLog({
      scope: auditMetadata.scope || 'workflow',
      entityType: type,
      entityId: docId,
      entityLabel: auditMetadata.doc_no || null,
      sourceModule: auditMetadata.source_module || 'workflow',
      docId,
      docType: type,
      action,
      details,
      userEmail,
      metadata: auditMetadata,
    })

    if (!auditResult?.success) {
      console.error('system_audit_logs Error:', auditResult?.error)
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
      .eq('assigned_to_id', profile.id)

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
      
      const mapped = data?.map(l => ({
        ...l,
        message: l.details || 'Unknown Error',
        metadata: {
          ...l.metadata,
          source: l.action // Using action column as source for UI display
        }
      })) || []

      return { data: mapped, count }
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

  const now = new Date().toISOString()
  let lastApprovedOrder = 0

  // --------------------------------------------------------------------------
  // 🟢 FULL CUTOVER (Phase 3 & 4): Dynamic Step Execution
  // --------------------------------------------------------------------------
  const roleSigMap = {
    'it_staff': initialSignatures.it,
    'admin': initialSignatures.it, // Treat admin similarly for IT step if needed
    'reporter': initialSignatures.reporter,
    'manager': initialSignatures.manager
  }

  for (const step of steps) {
    const sigData = roleSigMap[step.role_required]
    
    // 🛡️ Step: IT Officer is always approved during Resolve (Log-only)
    if (step.role_required === 'it_staff' || step.role_required === 'admin') {
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
        `อนุมัติขั้นที่ ${step.step_order} | ${sigData?.name || 'IT Officer'} (Auto-approved during Resolve)`,
        submitterEmail
      )
      lastApprovedOrder = step.step_order
      continue
    }

    // 🛡️ Step: Reporter - Optional Auto-approval via PIN
    if (step.role_required === 'reporter') {
      if (reporterPIN) {
        // Assume verifyEmployeePIN is imported or we use fetch. In this context, verifyEmployeePIN from '@/app/actions/users' should be used.
        // Wait, applySignaturesToWorkflow doesn't have verifyEmployeePIN imported directly. 
        // Let's use the validateSignaturePin from lib/workflow.js, which we will update in a moment.
        // Wait, the previous legacy code had:
        // const pinCheck = await verifyEmployeePIN(sigData?.userId, reporterPIN)
        // Which means verifyEmployeePIN was ALREADY imported or used in workflow.js!
        // Let's check imports. Wait, I shouldn't assume. The previous legacy block had `await verifyEmployeePIN(...)`.
        // So I will just use it exactly as it was.
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
          `อนุมัติขั้นที่ ${step.step_order} | ${sigData?.name || 'Reporter'} (Verified by PIN during Resolve)`,
          submitterEmail
        )
        lastApprovedOrder = step.step_order
        continue
      } else {
        // No PIN provided, so the reporter must approve manually later.
        break
      }
    }

    // Stop execution for other roles (like manager) as they need manual approval
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

    if (targetType === 'incident') {
      if (autoApproved) {
        await closeIncidentSlaPauseWindow(supabaseAdmin, docId)
      } else {
        const pauseTransition = await transitionIncidentPauseToPendingApproval(supabaseAdmin, docId)
        if (pauseTransition.closedCount > 0) {
          await recordLog(
            docId,
            'incident',
            'Auto-close Manual SLA Exclusion on Submit',
            `ระบบปิดช่วงหยุด SLA ที่เปิดค้างอยู่ ${pauseTransition.closedCount} ช่วง ก่อนเข้า Pending Approval`,
            userEmail
          )
        }
        if (pauseTransition.opened) {
          await recordLog(
            docId,
            'incident',
            'System pause: Pending Approval started',
            `ระบบเริ่มช่วงหยุด SLA อัตโนมัติสำหรับ Pending Approval ที่ ${pauseTransition.at}`,
            userEmail
          )
        }
      }
    }

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
        await closeIncidentSlaPauseWindow(supabaseAdmin, docId)
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

    // 3. [NEW] Dynamic Role Resolution (e.g., 'reporter', 'creator')
    // If any step requires a dynamic role, fetch the source document and inject their ID
    const hasDynamicRoles = stepsToInsert.some(s => ['reporter', 'creator'].includes(s.role_required))
    if (hasDynamicRoles) {
      const reg = WORKFLOW_DOC_REGISTRY[targetType?.toLowerCase()]
      if (reg) {
        const { data: doc } = await supabaseAdmin
          .from(reg.table)
          .select('*')
          .eq('id', docId)
          .single()
        
        if (doc) {
          // Resolve IDs asynchronously and map to steps
          stepsToInsert = await Promise.all(stepsToInsert.map(async s => {
            if (['reporter', 'creator'].includes(s.role_required)) {
              const dynamicId = await resolveDynamicWorkflowApproverId({ role_required: s.role_required, doc_type: targetType }, doc)
              // Hard guard: incident + external reporter => reporter step must stay null
              if (targetType?.toLowerCase() === 'incident' && s.role_required === 'reporter' && !doc?.reported_by_id) {
                return { ...s, approver_id: null }
              }
              return { ...s, approver_id: dynamicId }
            }
            return s
          }))
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
    const normalizedDocType = docType.toLowerCase()
    const reg = WORKFLOW_DOC_REGISTRY[normalizedDocType]
    if (!reg) return { error: 'Invalid document type' }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role')
      .eq('id', session.user.id)
      .maybeSingle()
    if (profileErr) throw profileErr
    if (!profile) return { error: 'Profile not found' }

    const { data: currentStep, error: stepErr } = await supabaseAdmin
      .from('document_approvals')
      .select('id, approver_id, role_required, step_order')
      .eq('doc_id', docId)
      .eq('doc_type', normalizedDocType)
      .eq('status', 'pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (stepErr) throw stepErr
    if (!currentStep) return { error: 'No pending approval step found' }

    const isAdmin = normalizeRole(profile.role) === 'admin'
    const isStepApprover = currentStep.approver_id === profile.id
    const isRolePoolApprover = !currentStep.approver_id && currentStep.role_required === profile.role
    if (!isAdmin && !isStepApprover && !isRolePoolApprover) {
      return { error: 'Access Denied: You do not have permission to reject this document.' }
    }

    // 1. Update Main Table
    const { error: updateErr } = await supabaseAdmin
      .from(reg.table)
      .update({
        [reg.workflow_status_field]: 'draft',
        [reg.status_field]: normalizedDocType === 'incident' ? 'In Progress' : 'Open', // Return to editing state
        assigned_approver_id: null
      })
      .eq('id', docId)

    if (updateErr) throw updateErr

    if (normalizedDocType === 'incident') {
      await closeIncidentSlaPauseWindow(supabaseAdmin, docId)
    }

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

/**
 * 🚫 Cancel Document (ยกเลิกเอกสาร)
 * - Checklist: Creator/Admin can cancel
 * - Incident: Requires PIN/OTP verification from Reporter
 */
export async function cancelDocument(docId, docType, reason, verification = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const reg = WORKFLOW_DOC_REGISTRY[docType.toLowerCase()]
    if (!reg) return { error: 'Invalid document type' }

    // 1. Get document info to check permissions
    const { data: doc, error: docErr } = await supabaseAdmin
      .from(reg.table)
      .select(`*, reported_by_id, reporter_email, reported_by, created_by_id, ${reg.no_field}`)
      .eq('id', docId)
      .single()

    if (docErr) throw docErr
    if (!doc) return { error: 'Document not found' }

    // 2. Check if already cancelled or closed
    if (doc[reg.status_field] === 'Cancelled') return { error: 'เอกสารนี้ถูกยกเลิกไปแล้ว' }
    if (doc[reg.status_field] === 'Closed') return { error: 'ไม่สามารถยกเลิกเอกสารที่ปิดสำเร็จแล้ว' }

    // 3. Permission & Verification Check
    const currentUserId = session.user.id
    const { data: currentUser } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()

    const isAdmin = normalizeRole(currentUser?.role) === 'admin'
    const isCreator = doc.created_by_id === currentUserId

    if (docType.toLowerCase() === 'incident') {
      // Incident: Uses unified verification policy (admin/reporter/it_staff-assignee)
      const reporterId = doc.reported_by_id || null
      const hasReporterAccount = Boolean(reporterId)
      const externalReporterEmail = normalizeEmail(doc.reporter_email)
      const policy = deriveIncidentCancelVerificationPolicy({
        actorRole: currentUser?.role,
        actorId: currentUserId,
        incident: doc,
      })
      if (!policy.allowed) return { error: 'เฉพาะ Admin, Reporter, หรือ IT Staff/Assignee เท่านั้นที่สามารถยกเลิกการอนุมัติได้' }

      // Verification required for Incident cancellation
      if (!verification || (!verification.pin && !verification.otp)) {
        return { error: 'การยกเลิก Incident ต้องมีการยืนยันตัวตนด้วย PIN หรือ OTP', requiresVerification: true }
      }

      if (policy.mode === 'admin_pin') {
        if (!verification.pin) return { error: 'Administrator ต้องยืนยันด้วย PIN ของตนเองก่อนยกเลิกเอกสาร' }
        const adminPinCheck = await verifyEmployeePIN(currentUserId, verification.pin)
        if (!adminPinCheck.success) return { error: adminPinCheck.error || 'รหัส PIN ของ Administrator ไม่ถูกต้อง' }
      } else if (policy.mode === 'reporter_pin') {
        if (!verification.pin) return { error: 'ผู้แจ้งต้องยืนยันด้วย PIN ของตนเองก่อนยกเลิกเอกสาร' }
        const reporterPinCheck = await verifyEmployeePIN(reporterId, verification.pin)
        if (!reporterPinCheck.success) return { error: reporterPinCheck.error || 'รหัส PIN ของผู้แจ้งไม่ถูกต้อง' }
      } else if (policy.mode === 'reporter_pin_or_otp') {
        if (verification.pin) {
          const pinCheck = await verifyEmployeePIN(reporterId, verification.pin)
          if (!pinCheck.success) return { error: pinCheck.error || 'รหัส PIN ของผู้แจ้งไม่ถูกต้อง' }
        } else if (verification.otp) {
          const { verifyEmployeeSignatureOTP } = await import('./users')
          const otpCheck = await verifyEmployeeSignatureOTP(reporterId, verification.otp)
          if (!otpCheck.success) return { error: otpCheck.error || 'รหัส OTP ของผู้แจ้งไม่ถูกต้อง' }
        } else {
          return { error: 'ต้องยืนยันด้วย PIN หรือ OTP ของผู้แจ้ง', requiresVerification: true }
        }
      } else if (policy.mode === 'external_reporter_otp') {
        if (!verification.otp) return { error: 'ผู้แจ้งภายนอกต้องยืนยันด้วย OTP ทางอีเมล', requiresVerification: true }
        const otpCheck = await verifyIncidentEmailOtp(supabaseAdmin, externalReporterEmail, verification.otp)
        if (!otpCheck.success) return { error: otpCheck.error || 'รหัส OTP ไม่ถูกต้อง' }
        await recordLog(
          docId,
          'incident',
          'OTP Verified',
          `ยืนยัน OTP สำหรับผู้แจ้งภายนอก (${externalReporterEmail}) เพื่อยกเลิกเอกสาร`,
          session.user.email
        )
      } else {
        return { error: 'รูปแบบการยืนยันตัวตนไม่รองรับ' }
      }
    } else if (docType.toLowerCase() === 'checklist') {
      // Checklist: Creator or Admin can cancel
      if (!isAdmin && !isCreator) {
        return { error: 'เฉพาะผู้สร้างเอกสารหรือ Admin เท่านั้นที่สามารถยกเลิก Checklist ได้' }
      }
    }

    const normalizedDocType = docType.toLowerCase()
    const isIncidentDoc = normalizedDocType === 'incident'

    // 4. Update main table status
    // Incident uses "Cancel Approve" behavior: return to editable flow instead of hard-cancel status.
    const nextWorkflowStatus = isIncidentDoc ? 'draft' : null
    const nextMainStatus = isIncidentDoc ? 'In Progress' : 'Cancelled'
    const baseUpdate = {
      [reg.workflow_status_field]: nextWorkflowStatus,
      [reg.status_field]: nextMainStatus,
      assigned_approver_id: null
    }

    const cancelAuditUpdate = isIncidentDoc
      ? {}
      : {
          cancelled_at: new Date().toISOString(),
          cancelled_by: session.user.email,
          cancel_reason: reason
        }

    const { error: updateErr } = await supabaseAdmin
      .from(reg.table)
      .update({ ...baseUpdate, ...cancelAuditUpdate })
      .eq('id', docId)

    if (updateErr) throw updateErr

    // 5. Cancel all pending workflow steps
    await supabaseAdmin
      .from('document_approvals')
      .update({ status: 'cancelled', comment: `Cancelled: ${reason}` })
      .eq('doc_id', docId)
      .in('status', ['pending', 'waiting'])

    // 6. Record Log
    const docNo = doc[reg.no_field] || docId
    const actionLabel = isIncidentDoc ? 'Approval Cancelled' : 'Cancelled'
    const actionDetail = isIncidentDoc
      ? `ยกเลิกการส่งอนุมัติเอกสาร ${docNo} | เหตุผล: ${reason}`
      : `ยกเลิกเอกสาร ${docNo} | เหตุผล: ${reason}`
    await recordLog(docId, normalizedDocType, actionLabel, actionDetail, session.user.email)

    // 7. For Checklist: Recreate option notification (2.1 requirement)
    if (normalizedDocType === 'checklist') {
      // Log information about recreation availability
      await recordLog(docId, 'checklist', 'Info', 'เอกสารถูกยกเลิก สามารถสร้างใหม่ได้จากเมนูตรวจสอบและความถี่', session.user.email)
    }

    return { success: true, docNo }
  } catch (err) {
    console.error('cancelDocument Error:', err)
    return { error: err.message }
  }
}

/**
 * 📧 Request OTP for Incident Cancellation
 */
export async function requestIncidentCancelOTP(docId) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()

    // Get incident reporter
    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select('reported_by_id, created_by_id, reporter_email, reported_by, case_number')
      .eq('id', docId)
      .single()

    if (incErr) throw incErr

    const reporterId = incident.reported_by_id || null
    const hasReporterAccount = Boolean(reporterId)
    const { data: currentUser } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
    const policy = deriveIncidentCancelVerificationPolicy({
      actorRole: currentUser?.role,
      actorId: session.user.id,
      incident
    })
    if (!policy.allowed || !policy.allowOtp) {
      return { error: 'สิทธิ์ของคุณไม่รองรับการขอ OTP สำหรับยกเลิกการอนุมัติ' }
    }

    if (hasReporterAccount) {
      const { requestEmployeeSignatureOTP } = await import('./users')
      const result = await requestEmployeeSignatureOTP(reporterId)
      if (result.success) {
        return { success: true, message: `ส่ง OTP ไปยังอีเมลของผู้แจ้งแล้ว (Case: ${incident.case_number})` }
      }
      return result
    }

    const result = await requestIncidentEmailOtp(
      supabaseAdmin,
      incident.reporter_email,
      incident.reported_by || 'ผู้แจ้ง',
      'cancel'
    )

    if (!result.success) return { error: result.error || 'ไม่สามารถส่ง OTP ได้' }

    await recordLog(
      docId,
      'incident',
      'OTP Requested',
      `ขอ OTP ไปยังอีเมลผู้แจ้งภายนอก ${result.maskedEmail || incident.reporter_email}`,
      session.user.email
    )

    return { success: true, message: `ส่ง OTP ไปยังอีเมลผู้แจ้งแล้ว (Case: ${incident.case_number})` }
  } catch (err) {
    console.error('requestIncidentCancelOTP Error:', err)
    return { error: err.message }
  }
}

export async function requestIncidentApprovalOTP(docId, stepId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select('reported_by_id, reporter_email, reported_by, case_number')
      .eq('id', docId)
      .single()
    if (incErr) throw incErr

    const { data: pendingStep, error: stepErr } = await supabaseAdmin
      .from('document_approvals')
      .select('id, approver_id, role_required, status')
      .eq('doc_id', docId)
      .eq('doc_type', 'incident')
      .in('status', ['pending'])
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (stepErr) throw stepErr

    const targetApproverId = stepId ? (
      (await supabaseAdmin
        .from('document_approvals')
        .select('id, approver_id, role_required, status')
        .eq('id', stepId)
        .eq('doc_id', docId)
        .eq('doc_type', 'incident')
        .in('status', ['pending'])
        .maybeSingle()
      ).data?.approver_id || null
    ) : (pendingStep?.approver_id || null)

    if (targetApproverId) {
      const { requestEmployeeSignatureOTP } = await import('./users')
      const result = await requestEmployeeSignatureOTP(targetApproverId)
      if (!result.success) return result
      return { success: true, message: `ส่ง OTP ไปยังอีเมลผู้อนุมัติแล้ว (Case: ${incident.case_number})` }
    }

    const result = await requestIncidentEmailOtp(
      supabaseAdmin,
      incident.reporter_email,
      incident.reported_by || 'ผู้แจ้ง',
      'approval'
    )
    if (!result.success) return { error: result.error || 'ไม่สามารถส่ง OTP ได้' }

    await recordLog(
      docId,
      'incident',
      'OTP Requested',
      `ขอ OTP เพื่ออนุมัติแทนไปยังอีเมลผู้แจ้งภายนอก ${result.maskedEmail || incident.reporter_email}`,
      session.user.email
    )

    return { success: true, message: `ส่ง OTP ไปยังอีเมลผู้แจ้งแล้ว (Case: ${incident.case_number})` }
  } catch (err) {
    console.error('requestIncidentApprovalOTP Error:', err)
    return { error: err.message }
  }
}

export async function verifyIncidentApprovalOTP(docId, otp, stepId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select('reported_by_id, reporter_email, case_number')
      .eq('id', docId)
      .single()
    if (incErr) throw incErr

    const stepQuery = supabaseAdmin
      .from('document_approvals')
      .select('id, approver_id, role_required, status')
      .eq('doc_id', docId)
      .eq('doc_type', 'incident')
      .in('status', ['pending'])
      .order('step_order', { ascending: true })
      .limit(1)

    const { data: pendingRow, error: pendingErr } = await (stepId
      ? supabaseAdmin
          .from('document_approvals')
          .select('id, approver_id, role_required, status')
          .eq('id', stepId)
          .eq('doc_id', docId)
          .eq('doc_type', 'incident')
          .in('status', ['pending'])
          .maybeSingle()
      : stepQuery.maybeSingle())
    if (pendingErr) throw pendingErr

    const pendingStep = pendingRow || null
    if (pendingStep?.approver_id) {
      const { verifyEmployeeSignatureOTP } = await import('./users')
      const otpCheck = await verifyEmployeeSignatureOTP(pendingStep.approver_id, otp)
      if (!otpCheck.success) {
        return { success: false, error: otpCheck.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' }
      }
      return { success: true, message: `ยืนยัน OTP สำเร็จ (Case: ${incident.case_number})` }
    }

    const otpCheck = await verifyIncidentEmailOtp(supabaseAdmin, incident?.reporter_email, otp)
    if (!otpCheck.success) {
      return { success: false, error: otpCheck.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' }
    }

    return { success: true, message: `ยืนยัน OTP สำเร็จ (Case: ${incident.case_number})` }
  } catch (err) {
    console.error('verifyIncidentApprovalOTP Error:', err)
    return { success: false, error: err.message }
  }
}

export async function diagnoseIncidentApprovalOTP(docId, otp, stepId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select('reporter_email, case_number')
      .eq('id', docId)
      .single()
    if (incErr) throw incErr

    const { data: pendingStep, error: stepErr } = await (stepId
      ? supabaseAdmin
          .from('document_approvals')
          .select('id, approver_id, status')
          .eq('id', stepId)
          .eq('doc_id', docId)
          .eq('doc_type', 'incident')
          .in('status', ['pending'])
          .maybeSingle()
      : supabaseAdmin
          .from('document_approvals')
          .select('id, approver_id, status')
          .eq('doc_id', docId)
          .eq('doc_type', 'incident')
          .in('status', ['pending'])
          .order('step_order', { ascending: true })
          .limit(1)
          .maybeSingle())
    if (stepErr) throw stepErr

    if (pendingStep?.approver_id) {
      const { data: user, error: userErr } = await supabaseAdmin
        .from('user_profiles')
        .select('id, otp_code, otp_expires_at, otp_attempts')
        .eq('id', pendingStep.approver_id)
        .maybeSingle()
      if (userErr) throw userErr
      if (!user) return { success: false, error: 'ไม่พบข้อมูลผู้อนุมัติสำหรับตรวจสอบ OTP' }
      if ((user.otp_attempts || 0) >= 5) return { success: false, error: 'คุณกรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่' }
      if (!user.otp_code || user.otp_code !== String(otp || '').trim()) {
        await supabaseAdmin.from('user_profiles').update({ otp_attempts: (user.otp_attempts || 0) + 1 }).eq('id', user.id)
        return { success: false, error: 'รหัส OTP ไม่ถูกต้อง' }
      }
      if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
        return { success: false, error: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' }
      }
      return { success: true, message: `ยืนยัน OTP สำเร็จ (Case: ${incident.case_number})` }
    }

    const email = normalizeEmail(incident?.reporter_email)
    const code = String(otp || '').trim()
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('email_otps')
      .select('email, otp_code, expires_at, attempts')
      .eq('email', email)
      .maybeSingle()
    if (rowErr) throw rowErr
    if (!row) return { success: false, error: 'ไม่พบคำขอ OTP สำหรับอีเมลนี้' }
    if ((row.attempts || 0) >= 5) return { success: false, error: 'กรอกรหัสผิดเกินกำหนด กรุณาขอ OTP ใหม่' }
    if (!row.otp_code || row.otp_code !== code) {
      await supabaseAdmin.from('email_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('email', email)
      return { success: false, error: 'รหัส OTP ไม่ถูกต้อง' }
    }
    if (!row.expires_at || new Date(row.expires_at) < new Date()) {
      return { success: false, error: 'รหัส OTP หมดอายุแล้ว' }
    }
    return { success: true, message: `ยืนยัน OTP สำเร็จ (Case: ${incident.case_number})` }
  } catch (err) {
    console.error('diagnoseIncidentApprovalOTP Error:', err)
    return { success: false, error: err.message }
  }
}

async function verifyApprovalIdentity({
  supabaseAdmin,
  session,
  docId,
  docType,
  currentStep,
  docData,
  pin,
  otp,
  actualApproverId,
  isDirectApproval,
  isExternalReporterStep
}) {
  const normalizedDocType = String(docType || '').toLowerCase()

  if (isExternalReporterStep) {
    const otpCheck = await verifyIncidentEmailOtp(supabaseAdmin, docData?.reporter_email, otp)
    if (!otpCheck.success) {
      return {
        success: false,
        error: otpCheck.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ',
        verificationType: 'OTP',
        verificationResult: 'failed',
      }
    }

    await recordAuditLog({
      docId,
      docType: normalizedDocType,
      action: 'Remote Verify Passed',
      details: 'ยืนยันตัวตนด้วย OTP สำเร็จสำหรับ Reporter External',
      userEmail: session.user.email,
      metadata: {
        actor_user_id: session.user.id,
        actor_role: session.type === 'external' ? (session.user.role || 'external') : 'internal',
        target_approver_id: actualApproverId || null,
        target_role_required: currentStep?.role_required || null,
        verification_type: 'OTP',
        verification_result: 'success',
        is_remote: true,
        step_id: currentStep?.id || null,
        step_order: currentStep?.step_order || null,
      }
    })

    return { success: true, verificationType: 'OTP', verificationResult: 'success' }
  }

  if (!isDirectApproval) {
    if (!pin && !otp) {
      return {
        success: false,
        error: 'การอนุมัติแทนจำเป็นต้องระบุรหัส PIN หรือ OTP ของผู้อนุมัติ',
        verificationType: 'NONE',
        verificationResult: 'failed',
      }
    }

    if (otp) {
      const { verifyEmployeeSignatureOTP } = await import('./users')
      const otpCheck = await verifyEmployeeSignatureOTP(actualApproverId, otp)
      if (!otpCheck.success) {
        return {
          success: false,
          error: otpCheck.error || 'รหัส OTP ของผู้อนุมัติไม่ถูกต้อง',
          verificationType: 'OTP',
          verificationResult: 'failed',
        }
      }
      return { success: true, verificationType: 'OTP', verificationResult: 'success' }
    }

    const pinCheck = await verifyEmployeePIN(actualApproverId, pin)
    if (!pinCheck.success) {
      return {
        success: false,
        error: pinCheck.error || 'รหัส PIN ของผู้อนุมัติไม่ถูกต้อง',
        verificationType: 'PIN',
        verificationResult: 'failed',
      }
    }

    return { success: true, verificationType: 'PIN', verificationResult: 'success' }
  }

  if (otp) {
    const { verifyEmployeeSignatureOTP } = await import('./users')
    const otpCheck = await verifyEmployeeSignatureOTP(actualApproverId, otp)
    if (!otpCheck.success) {
      return {
        success: false,
        error: otpCheck.error || 'รหัส OTP ไม่ถูกต้อง',
        verificationType: 'OTP',
        verificationResult: 'failed',
      }
    }
    return { success: true, verificationType: 'OTP', verificationResult: 'success' }
  }

  if (pin) {
    const pinCheck = await verifyEmployeePIN(actualApproverId, pin)
    if (!pinCheck.success) {
      return {
        success: false,
        error: pinCheck.error || 'รหัส PIN ไม่ถูกต้อง',
        verificationType: 'PIN',
        verificationResult: 'failed',
      }
    }
    return { success: true, verificationType: 'PIN', verificationResult: 'success' }
  }

  return { success: true, verificationType: 'NONE', verificationResult: 'skipped' }
}

export async function submitApprovalStep(docId, docType, stepId, signatureData, comment = '', pin = null, overrideApproverId = null, otp = null) {
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

    const reg = WORKFLOW_DOC_REGISTRY[docType.toLowerCase()]
    const { data: docData } = reg
      ? await supabaseAdmin.from(reg.table).select('reported_by_id, reporter_email').eq('id', docId).maybeSingle()
      : { data: null }

    const isIncidentReporterStep = docType.toLowerCase() === 'incident' && currentStep.role_required === 'reporter'
    const isExternalReporterStep = Boolean(isIncidentReporterStep && !docData?.reported_by_id)

    // 🛡️ SECURITY: PIN/OTP Verification Enforcement
    const actualApproverId = currentStep.approver_id || overrideApproverId || session.user.id
    const isDirectApproval = actualApproverId === session.user.id

    const verifyResult = await verifyApprovalIdentity({
      supabaseAdmin,
      session,
      docId,
      docType,
      currentStep,
      docData,
      pin,
      otp,
      actualApproverId,
      isDirectApproval,
      isExternalReporterStep
    })
    if (!verifyResult.success) {
      return { error: verifyResult.error }
    }

    // 2. Execute Transactional Approval via RPC
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('full_name, email').eq('id', actualApproverId).single()
    const fullName = profile?.full_name || (overrideApproverId ? 'Unknown Approver' : session.user.email)
    const email = profile?.email || session.user.email
    
    const isRemote = !isDirectApproval
    const verifyTag = isRemote
      ? (verifyResult.verificationType === 'OTP' ? ' [Verify by OTP]' : ' [Verify by PIN]')
      : (verifyResult.verificationType === 'PIN' ? ' [Verify by PIN]' : '')
    const logDetails = `อนุมัติโดย: ${fullName} (${email})${verifyTag}${comment ? ` | Note: ${comment}` : ''}`

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

    if (isRemote || verifyResult.verificationType !== 'NONE') {
      await recordAuditLog({
        docId,
        docType: docType.toLowerCase(),
        action: 'Approval Verification Audit',
        details: `actor=${session.user.email} | target=${email} | verify=${verifyResult.verificationType} | result=${verifyResult.verificationResult}`,
        userEmail: session.user.email,
        metadata: {
          actor_user_id: session.user.id,
          actor_role: session.type === 'external' ? (session.user.role || 'external') : 'internal',
          target_approver_id: actualApproverId || null,
          target_approver_email: email || null,
          target_role_required: currentStep?.role_required || null,
          verification_type: verifyResult.verificationType,
          verification_result: verifyResult.verificationResult,
          is_remote: isRemote,
          step_id: currentStep?.id || null,
          step_order: currentStep?.step_order || null,
        }
      })
    }

    // 3. Cross-module sync if final
    if (rpcRes.is_final) {
      if (docType.toLowerCase() === 'incident') {
        await closeIncidentSlaPauseWindow(supabaseAdmin, docId)
      }
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

export async function resetDocumentWorkflow(docId, docType, reason = '', options = {}) {
  try {
    const normalizedDocType = String(docType || '').toLowerCase()
    const reg = WORKFLOW_DOC_REGISTRY[normalizedDocType]
    if (!reg) return { error: 'Invalid document type' }

    const skipAuth = options?.skipAuth === true
    const session = skipAuth ? null : await getCurrentUserSession()
    if (!skipAuth && (!session || session.type !== 'internal')) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const actorEmail = options?.actorEmail || session?.user?.email || 'system@internal'
    const actorName = options?.actorName || actorEmail
    const reopenReason = String(reason || '').trim()

    const currentDocSelect = normalizedDocType === 'incident'
      ? 'id, status, workflow_status, acknowledged_at, assigned_at, assigned_to_id, assigned_to'
      : 'id, status, workflow_status'

    const { data: currentDoc, error: currentErr } = await supabaseAdmin
      .from(reg.table)
      .select(currentDocSelect)
      .eq('id', docId)
      .maybeSingle()
    if (currentErr) throw currentErr
    if (!currentDoc) return { error: 'Document not found' }

    const shouldReturnToInProgress = normalizedDocType === 'incident' && Boolean(
      currentDoc?.acknowledged_at ||
      currentDoc?.assigned_at ||
      currentDoc?.assigned_to_id ||
      currentDoc?.assigned_to
    )
    const reopenStatus = shouldReturnToInProgress ? 'In Progress' : 'Open'

    const updateData = {
      [reg.status_field]: reopenStatus,
      [reg.workflow_status_field]: normalizedDocType === 'incident' ? 'rejected' : null,
      assigned_approver_id: null,
    }
    if (normalizedDocType === 'checklist') {
      updateData.approved_by = null
      updateData.approved_at = null
    }

    const { error: updateErr } = await supabaseAdmin
      .from(reg.table)
      .update(updateData)
      .eq('id', docId)
    if (updateErr) throw updateErr

    const { error } = await supabaseAdmin
      .from('document_approvals')
      .delete()
      .eq('doc_id', docId)
      .eq('doc_type', normalizedDocType)
    
    if (error) throw error

    if (normalizedDocType === 'incident') {
      await closeIncidentSlaPauseWindow(supabaseAdmin, docId)
    }

    const statusTransition = `สถานะเอกสาร: ${currentDoc.status || '-'} -> ${reopenStatus} | workflow_status: ${currentDoc.workflow_status || '-'} -> ${normalizedDocType === 'incident' ? 'rejected' : 'null'}`
    const reasonText = reopenReason ? ` | เหตุผล: ${reopenReason}` : ''
    await recordLog(
      docId,
      normalizedDocType,
      'Reopen Case',
      `${statusTransition}${reasonText} | ผู้ดำเนินการ: ${actorName}`,
      actorEmail
    )

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
    }
    if (docType.toLowerCase() === 'checklist') {
      updateData.approved_by = null
      updateData.approved_at = null
    }

    const { error: resetError } = await supabaseAdmin
      .from(reg.table)
      .update(updateData)
      .eq('id', docId)

    if (resetError) throw resetError

    // 4. Reset document_approvals table
    await resetDocumentWorkflow(docId, docType, `Admin Override ผ่าน Approval Logs`, {
      skipAuth: true,
      actorEmail: session.user.email,
      actorName: profile.full_name,
    })

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
