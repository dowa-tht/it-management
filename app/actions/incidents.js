'use server'

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { getCurrentUserSession } from './user'
import { getNextNo, updateLastNo } from '@/lib/noSeries'
import { generateWorkflowSteps, recordLog, recordSystemError } from './workflow'
import { WORKFLOW_DOC_REGISTRY } from '@/lib/workflowRegistry'
import { sendEmail } from '@/lib/resend'

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const toSafeDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const isRangeOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart
const OTP_TTL_MINUTES = 30
const OTP_COOLDOWN_SECONDS = 60
const INCIDENT_FOLLOWUP_TOKEN_TTL_DAYS = 7
const INCIDENT_FOLLOWUP_RESEND_COOLDOWN_SECONDS = 60

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

async function isInternalUserEmail(supabaseAdmin, email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', normalized)
    .eq('is_active', true)
    .maybeSingle()
  return Boolean(profile?.id)
}

function maskEmail(email) {
  const value = normalizeEmail(email)
  const [local, domain] = value.split('@')
  if (!local || !domain) return value
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

function buildPublicBaseUrl() {
  const direct = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ||
    ''
  ).trim().replace(/\/+$/, '')
  if (direct) return direct

  const vercelUrl = String(process.env.VERCEL_URL || '').trim().replace(/\/+$/, '')
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  }

  return 'http://localhost:3000'
}

async function issueIncidentFollowupToken({
  supabaseAdmin,
  incidentId,
  reporterEmail,
  createdById,
  createdByEmail,
  caseNumber,
  reporterName,
  revokeReason = 'rotated_on_new_issue',
}) {
  const email = normalizeEmail(reporterEmail)
  if (!incidentId || !email) return { success: false, error: 'ไม่สามารถออก Follow-up Token ได้' }

  const tokenPlain = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INCIDENT_FOLLOWUP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('incident_followup_tokens')
    .update({
      revoked_at: now.toISOString(),
      revoked_reason: revokeReason,
    })
    .eq('incident_id', incidentId)
    .eq('reporter_email', email)
    .is('revoked_at', null)

  const { error: tokenErr } = await supabaseAdmin
    .from('incident_followup_tokens')
    .insert({
      incident_id: incidentId,
      reporter_email: email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_id: createdById || null,
      created_by_email: createdByEmail || null,
    })

  if (tokenErr) return { success: false, error: tokenErr.message }

  const baseUrl = buildPublicBaseUrl()
  if (!baseUrl) return { success: false, error: 'ไม่พบค่า NEXT_PUBLIC_SITE_URL สำหรับสร้างลิงก์ติดตามเคส' }
  const followupUrl = `${baseUrl}/public/incidents/followup/${incidentId}?token=${encodeURIComponent(tokenPlain)}`

  const mailResult = await sendEmail({
    to: email,
    subject: `[DOWA IT] ติดตามสถานะ Incident ${caseNumber || ''}`.trim(),
    html: `
      <div style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h3 style="margin-top: 0; color: #0f172a;">ลิงก์ติดตามสถานะ Incident</h3>
          <p style="font-size: 14px; color: #334155;">สวัสดีคุณ <strong>${reporterName || 'ผู้แจ้ง'}</strong></p>
          <p style="font-size: 14px; color: #334155;">
            เคสของคุณถูกบันทึกแล้ว ${caseNumber ? `<strong>(${caseNumber})</strong>` : ''} คุณสามารถติดตามความคืบหน้าได้จากลิงก์ด้านล่าง:
          </p>
          <div style="margin: 20px 0;">
            <a href="${followupUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">
              เปิดหน้าติดตามเคส
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">ลิงก์นี้มีอายุ ${INCIDENT_FOLLOWUP_TOKEN_TTL_DAYS} วัน และใช้สำหรับติดตามเคสแบบอ่านอย่างเดียว</p>
        </div>
      </div>
    `,
  })

  if (mailResult?.error) return { success: false, error: 'ออกลิงก์ได้ แต่ส่งอีเมลติดตามเคสไม่สำเร็จ' }

  return { success: true, expiresAt, maskedEmail: maskEmail(email) }
}

export async function resendIncidentFollowupLink(incidentId) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const userEmail = session.user.email || 'system@internal'

    const { data: actor } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, full_name, email, is_active')
      .eq('id', session.user.id)
      .single()

    if (!actor || actor.is_active !== true) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งาน' }
    if (!['admin', 'it_staff'].includes(actor.role)) return { success: false, error: 'คุณไม่มีสิทธิ์ส่งลิงก์ติดตามเคสใหม่' }

    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select('id, case_number, status, reported_by_id, reported_by, reporter_email')
      .eq('id', incidentId)
      .single()
    if (incErr) throw incErr
    if (!incident) return { success: false, error: 'ไม่พบ Incident' }
    if (incident.reported_by_id) return { success: false, error: 'เคสนี้เป็นผู้แจ้งในระบบ ไม่ต้องใช้ Follow-up Link ภายนอก' }

    const reporterEmail = normalizeEmail(incident.reporter_email)
    if (!reporterEmail) return { success: false, error: 'ไม่พบอีเมลผู้แจ้งสำหรับส่งลิงก์ติดตามเคส' }

    const cooldownBound = new Date(Date.now() - INCIDENT_FOLLOWUP_RESEND_COOLDOWN_SECONDS * 1000)
    const { data: latestToken } = await supabaseAdmin
      .from('incident_followup_tokens')
      .select('issued_at')
      .eq('incident_id', incident.id)
      .eq('reporter_email', reporterEmail)
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestToken?.issued_at) {
      const issuedAt = new Date(latestToken.issued_at)
      if (!Number.isNaN(issuedAt.getTime()) && issuedAt > cooldownBound) {
        return { success: false, error: `กรุณารอ ${INCIDENT_FOLLOWUP_RESEND_COOLDOWN_SECONDS} วินาทีก่อนส่งลิงก์ใหม่อีกครั้ง` }
      }
    }

    const followupResult = await issueIncidentFollowupToken({
      supabaseAdmin,
      incidentId: incident.id,
      reporterEmail,
      createdById: actor.id,
      createdByEmail: actor.email || userEmail,
      caseNumber: incident.case_number,
      reporterName: incident.reported_by || 'ผู้แจ้ง',
      revokeReason: 'rotated_on_resend',
    })

    if (!followupResult.success) {
      await recordSystemError(
        'Incident',
        `Resend follow-up link failed for case ${incident.case_number}: ${followupResult.error}`,
        { incidentId: incident.id, reporterEmail }
      )
      return { success: false, error: followupResult.error || 'ไม่สามารถส่งลิงก์ติดตามเคสใหม่ได้' }
    }

    await recordLog(
      incident.id,
      'incident',
      'Follow-up Link Resent',
      `ส่งลิงก์ติดตามเคสใหม่ไปยัง ${followupResult.maskedEmail} (หมดอายุ ${followupResult.expiresAt})`,
      userEmail
    )

    return { success: true, expiresAt: followupResult.expiresAt, maskedEmail: followupResult.maskedEmail }
  } catch (err) {
    console.error('resendIncidentFollowupLink Error:', err)
    await recordSystemError('Incident', `Resend Follow-up Link failed: ${err.message}`, { error: err, incidentId })
    return { success: false, error: err.message }
  }
}

export async function requestIncidentReporterOtp(payload) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const reporterName = String(payload?.reported_by || '').trim()
    const reporterEmail = normalizeEmail(payload?.reporter_email)
    if (!reporterName) return { success: false, error: 'กรุณาระบุชื่อผู้แจ้ง' }
    if (!reporterEmail) return { success: false, error: 'กรุณาระบุอีเมลผู้แจ้ง' }

    const supabaseAdmin = getAdminClient()
    const alreadyInternalUser = await isInternalUserEmail(supabaseAdmin, reporterEmail)
    if (alreadyInternalUser) {
      return { success: false, error: 'อีเมลนี้มีบัญชีผู้ใช้ในระบบแล้ว กรุณาเลือกผู้แจ้งแบบผู้ใช้ในระบบ' }
    }

    const now = new Date()
    const cooldownBound = new Date(now.getTime() - OTP_COOLDOWN_SECONDS * 1000).toISOString()

    const { data: existing } = await supabaseAdmin
      .from('email_otps')
      .select('created_at')
      .eq('email', reporterEmail)
      .maybeSingle()

    if (existing?.created_at && new Date(existing.created_at).toISOString() > cooldownBound) {
      return { success: false, error: `กรุณารอ ${OTP_COOLDOWN_SECONDS} วินาทีก่อนขอ OTP ใหม่` }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

    const { error: upsertErr } = await supabaseAdmin
      .from('email_otps')
      .upsert({
        email: reporterEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
        attempts: 0,
        created_at: now.toISOString(),
      }, { onConflict: 'email' })

    if (upsertErr) throw upsertErr

    const mailResult = await sendEmail({
      to: reporterEmail,
      subject: '[DOWA IT] รหัส OTP สำหรับยืนยันการแจ้ง Incident',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
          <div style="max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
            <h3 style="margin-top: 0; color: #0f172a;">ยืนยันผู้แจ้ง Incident</h3>
            <p style="font-size: 14px; color: #334155;">สวัสดีคุณ <strong>${reporterName}</strong></p>
            <p style="font-size: 14px; color: #334155;">กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยันก่อนสร้าง Incident:</p>
            <div style="text-align:center; margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 10px;">
              <span style="font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #1d4ed8;">${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: #64748b;">รหัสนี้มีอายุ ${OTP_TTL_MINUTES} นาที</p>
          </div>
        </div>
      `,
    })

    if (mailResult?.error) {
      return { success: false, error: 'ไม่สามารถส่ง OTP ได้ กรุณาตรวจสอบบริการอีเมล' }
    }

    await recordLog(
      '00000000-0000-0000-0000-000000000000',
      'incident',
      'OTP Requested',
      `ขอ OTP สำหรับผู้แจ้งภายนอก: ${reporterName} <${reporterEmail}>`,
      session.user.email || 'system@internal'
    )

    return { success: true, maskedEmail: maskEmail(reporterEmail), expiresInMinutes: OTP_TTL_MINUTES }
  } catch (err) {
    console.error('requestIncidentReporterOtp Error:', err)
    return { success: false, error: err.message }
  }
}

export async function validateExternalReporterEmail(payload) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const reporterEmail = normalizeEmail(payload?.reporter_email)
    if (!reporterEmail) return { success: false, error: 'กรุณาระบุอีเมลผู้แจ้ง' }

    const supabaseAdmin = getAdminClient()
    const alreadyInternalUser = await isInternalUserEmail(supabaseAdmin, reporterEmail)
    if (alreadyInternalUser) {
      return { success: false, error: 'อีเมลนี้มีบัญชีผู้ใช้ในระบบแล้ว กรุณาเลือกผู้แจ้งแบบผู้ใช้ในระบบ' }
    }

    return { success: true }
  } catch (err) {
    console.error('validateExternalReporterEmail Error:', err)
    return { success: false, error: err.message }
  }
}

export async function verifyIncidentReporterOtp(payload) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const reporterName = String(payload?.reported_by || '').trim()
    const reporterEmail = normalizeEmail(payload?.reporter_email)
    const otp = String(payload?.otp || '').trim()
    if (!reporterName) return { success: false, error: 'กรุณาระบุชื่อผู้แจ้ง' }
    if (!reporterEmail) return { success: false, error: 'กรุณาระบุอีเมลผู้แจ้ง' }
    if (!otp) return { success: false, error: 'กรุณากรอกรหัส OTP' }

    const supabaseAdmin = getAdminClient()
    const { data: row } = await supabaseAdmin
      .from('email_otps')
      .select('email, otp_code, expires_at, attempts')
      .eq('email', reporterEmail)
      .maybeSingle()

    if (!row) return { success: false, error: 'ไม่พบคำขอ OTP สำหรับอีเมลนี้' }
    if ((row.attempts || 0) >= 5) return { success: false, error: 'กรอกรหัสผิดเกินกำหนด กรุณาขอ OTP ใหม่' }
    if (!row.otp_code || row.otp_code !== otp) {
      await supabaseAdmin.from('email_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('email', reporterEmail)
      return { success: false, error: 'รหัส OTP ไม่ถูกต้อง' }
    }
    if (new Date(row.expires_at) < new Date()) return { success: false, error: 'รหัส OTP หมดอายุแล้ว' }

    await supabaseAdmin.from('email_otps').update({ otp_code: null, attempts: 0 }).eq('email', reporterEmail)

    await recordLog(
      '00000000-0000-0000-0000-000000000000',
      'incident',
      'OTP Verified',
      `ยืนยัน OTP สำเร็จสำหรับผู้แจ้งภายนอก: ${reporterName} <${reporterEmail}>`,
      session.user.email || 'system@internal'
    )

    return {
      success: true,
      verifiedReporterEmail: reporterEmail,
      verifiedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('verifyIncidentReporterOtp Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 🚀 Server Action: สร้าง Incident ใหม่
 * รวม Logic การรันเลขที่เอกสาร, บันทึกข้อมูล, เริ่ม Workflow และบันทึก Logs ไว้ในที่เดียว
 */
export async function createIncident(formData) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const userEmail = session.user.email || 'system@internal'
    const userId = session.user.id

    // 1. ดึงเลขที่เอกสารล่าสุด (ใช้ Admin Client เพื่อข้าม RLS และเช็คเลขที่ซ้ำได้แม่นยำ)
    const nextNoData = await getNextNo('INC', new Date(), supabaseAdmin)
    const caseNo = nextNoData ? nextNoData.nextNo : `INC-${Date.now()}`

    // 2. เตรียมข้อมูลสำหรับบันทึก (แยก ref_doc_id ออกเพราะเป็น UI field)
    const {
      ref_doc_id,
      reporter_otp_verified_email,
      reporter_otp_verified_at,
      ...cleanData
    } = formData
    
    const { data: actorProfile, error: actorError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', session.user.id)
      .single()
      
    const creatorName = actorProfile ? (actorProfile.full_name || actorProfile.email) : userEmail

    const reporterName = (formData.reported_by || '').trim()
    let reporterEmail = (formData.reporter_email || '').trim().toLowerCase()
    if (!reporterEmail && formData.reported_by_id) {
      const { data: reporterProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', formData.reported_by_id)
        .maybeSingle()
      reporterEmail = (reporterProfile?.email || '').trim().toLowerCase()
    }
    if (!reporterName) {
      return { success: false, error: 'กรุณาระบุชื่อผู้แจ้ง' }
    }
    if (!reporterEmail) {
      return { success: false, error: 'กรุณาระบุอีเมลผู้แจ้งให้ครบถ้วน' }
    }

    const reporterMode = formData.reported_by_id ? 'existing_reporter' : 'external_reporter'
    if (reporterMode === 'external_reporter') {
      const verifiedEmail = normalizeEmail(formData.reporter_otp_verified_email)
      if (!verifiedEmail || verifiedEmail !== reporterEmail) {
        return { success: false, error: 'ผู้แจ้งภายนอกต้องยืนยัน OTP ก่อนสร้าง Incident' }
      }
    }

    const insertData = {
      ...cleanData,
      reporter_email: reporterEmail,
      case_number: caseNo,
      status: formData.assigned_to ? 'In Progress' : 'Open',
      acknowledged_at: formData.assigned_to ? new Date().toISOString() : null,
      assigned_at: formData.assigned_to ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      created_by_id: userId,
      created_by: creatorName
    }

    // 3. บันทึกลงตาราง incidents
    const { data: inserted, error: incError } = await supabaseAdmin
      .from('incidents')
      .insert([insertData])
      .select()
      .single()

    if (incError) throw incError
    const newInc = inserted
    const docId = newInc.id

    // 4. อัปเดตเลขที่เอกสารล่าสุดใน No Series
    try {
      await updateLastNo('INC', caseNo, null, supabaseAdmin)
    } catch (err) {
      console.warn('Failed to update No Series:', err)
    }

    // 5. [Phase 2] ข้ามการสร้าง Workflow ในขั้นตอนนี้ 
    // ย้ายไปสร้างในขั้นตอน Resolve (submitRequest) ตามมาตรฐาน Unified Workflow v2

    // 6. บันทึก Incident Log (สร้างเคสใหม่)
    await recordLog(
      docId, 
      'incident', 
      'สร้างเคสใหม่', 
      `แจ้งโดย: ${formData.reported_by} (${reporterEmail}) [mode=${reporterMode}]${formData.ref_doc_no ? ` (อ้างอิง ${formData.ref_doc_no})` : ''}`, 
      userEmail
    )

    // 7. หากมีการมอบหมายงานทันที ให้บันทึก Log เพิ่ม
    if (formData.assigned_to) {
      await recordLog(
        docId,
        'incident',
        'กำหนดผู้รับผิดชอบ',
        `มอบหมายให้: ${formData.assigned_to} · Response Time เริ่มนับแล้ว`,
        userEmail
      )
    }

    // 8. หากอ้างอิงมาจาก Checklist ให้บันทึก Log กลับไปยังต้นทางด้วย
    if (formData.ref_type === 'checklist' && ref_doc_id) {
      await recordLog(
        ref_doc_id,
        'checklist',
        'เปิด Incident Case',
        `เคสเลขที่: ${caseNo} | หัวข้อ: ${formData.title.replace('[Checklist Ref] ', '')}`,
        userEmail
      )
    }

    if (reporterMode === 'external_reporter') {
      const followupResult = await issueIncidentFollowupToken({
        supabaseAdmin,
        incidentId: docId,
        reporterEmail,
        createdById: userId,
        createdByEmail: userEmail,
        caseNumber: caseNo,
        reporterName,
      })

      if (followupResult.success) {
        await recordLog(
          docId,
          'incident',
          'Follow-up Link Issued',
          `ส่งลิงก์ติดตามเคสไปยัง ${followupResult.maskedEmail} (หมดอายุ ${followupResult.expiresAt})`,
          userEmail
        )
      } else {
        await recordSystemError(
          'Incident',
          `Create Incident follow-up link failed for case ${caseNo}: ${followupResult.error}`,
          { incidentId: docId, reporterEmail }
        )
      }
    }

    return { success: true, docId: docId, caseNo: caseNo }
  } catch (err) {
    console.error('createIncident Error:', err)
    await recordSystemError('Incident', `Create Incident failed: ${err.message}`, { error: err, formData: !!formData })
    return { success: false, error: err.message }
  }
}

/**
 * ✅ [Phase 2] Server Action: รับเรื่อง (Acknowledge)
 */
export async function acknowledgeIncident(id, severity, assigneeId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const allowedSeverities = ['Low', 'Medium', 'High']
    if (!allowedSeverities.includes(severity)) {
      return { success: false, error: 'ระดับความรุนแรงไม่ถูกต้อง' }
    }

    const supabaseAdmin = getAdminClient()
    const userEmail = session.user.email || 'system@internal'

    const { data: actorProfile, error: actorError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', session.user.id)
      .single()

    if (actorError || !actorProfile) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งานหรือผู้ใช้ถูกระงับ' }
    if (actorProfile.is_active !== true) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งานหรือผู้ใช้ถูกระงับ' }

    const { data: incident } = await supabaseAdmin
      .from('incidents')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!incident) return { success: false, error: 'ไม่พบเอกสาร Incident' }
    if (incident.status !== 'Open') return { success: false, error: 'เอกสารนี้ไม่อยู่ในสถานะ Open จึงรับเรื่องไม่ได้' }

    let finalAssignee = null
    let actionName = 'รับเรื่อง (Acknowledge)'
    let logDetails = ''

    if (actorProfile.role === 'it_staff') {
      finalAssignee = actorProfile
      actionName = 'รับเรื่อง (Acknowledge)'
      logDetails = `IT Staff: ${actorProfile.full_name || actorProfile.email || userEmail} รับเรื่องและเป็นผู้รับผิดชอบงาน | ระดับ: ${severity}`
    } else if (actorProfile.role === 'admin') {
      if (!assigneeId) return { success: false, error: 'กรุณาเลือก IT Staff ผู้รับผิดชอบงาน' }

      const { data: selectedAssignee } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', assigneeId)
        .single()

      if (!selectedAssignee) return { success: false, error: 'ไม่พบผู้รับผิดชอบงานที่เลือก' }
      if (selectedAssignee.is_active !== true) return { success: false, error: 'IT Staff ที่เลือกถูกระงับการใช้งาน' }
      if (selectedAssignee.role !== 'it_staff') return { success: false, error: 'ผู้รับผิดชอบงานต้องเป็น role IT Staff เท่านั้น' }

      finalAssignee = selectedAssignee
      actionName = 'มอบหมายงาน (Dispatch)'
      logDetails = `Administrator: ${actorProfile.full_name || actorProfile.email || userEmail} มอบหมายงานให้ IT Staff: ${finalAssignee.full_name || finalAssignee.email} | ระดับ: ${severity}`
    } else {
      return { success: false, error: 'คุณไม่มีสิทธิ์รับเรื่องหรือมอบหมายงาน Incident' }
    }

    const { data: updatedRows, error } = await supabaseAdmin
      .from('incidents')
      .update({
        status: 'In Progress',
        severity: severity,
        assigned_to_id: finalAssignee.id,
        assigned_to: finalAssignee.full_name || finalAssignee.email,
        acknowledged_at: new Date().toISOString(),
        assigned_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'Open')
      .select('id')

    if (error) throw error
    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'ไม่สามารถรับเรื่องได้ อาจมีผู้ใช้อื่นดำเนินการไปแล้ว' }
    }

    await recordLog(
      id, 
      'incident', 
      actionName, 
      logDetails, 
      userEmail
    )

    return { success: true }
  } catch (err) {
    console.error('acknowledgeIncident Error:', err)
    await recordSystemError('Incident', `Acknowledge Incident failed for ID ${id}: ${err.message}`, { error: err, id })
    return { success: false, error: err.message }
  }
}

export async function createIncidentExclusionManual(payload) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const incidentId = payload?.incident_id
    const reasonIdRaw = payload?.reason_id
    const startTime = payload?.start_time
    const endTime = payload?.end_time || null
    const notes = (payload?.notes || '').trim()

    if (!incidentId) return { success: false, error: 'ไม่พบ Incident ID' }
    if (reasonIdRaw === undefined || reasonIdRaw === null || String(reasonIdRaw).trim() === '') {
      return { success: false, error: 'กรุณาเลือกเหตุผลการหยุดนับ SLA' }
    }
    if (!startTime) return { success: false, error: 'กรุณาระบุเวลาเริ่มต้น' }
    const now = new Date()
    const startDt = toSafeDate(startTime)
    const endDt = endTime ? toSafeDate(endTime) : null
    if (!startDt || (endTime && !endDt)) {
      return { success: false, error: 'รูปแบบวันเวลาไม่ถูกต้อง' }
    }
    if (endDt && endDt <= startDt) {
      return { success: false, error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' }
    }
    if (startDt > now) return { success: false, error: 'เวลาเริ่มต้นต้องไม่เป็นเวลาในอนาคต' }
    if (endDt && endDt > now) return { success: false, error: 'เวลาสิ้นสุดต้องไม่เป็นเวลาในอนาคต' }

    const supabaseAdmin = getAdminClient()
    const { data: actor } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, full_name, email, is_active')
      .eq('id', session.user.id)
      .single()

    if (!actor || actor.is_active !== true) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งาน' }
    if (!['admin', 'it_staff'].includes(actor.role)) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เพิ่ม SLA Exclusion' }
    }

    const { data: reason } = await supabaseAdmin
      .from('master_data')
      .select('id, value, is_active')
      .eq('id', reasonIdRaw)
      .eq('type', 'sla_exclusion_reason')
      .single()
    if (!reason || reason.is_active !== true) {
      return { success: false, error: 'เหตุผล SLA Exclusion ไม่ถูกต้องหรือถูกปิดใช้งาน' }
    }

    const { data: incident, error: incidentErr } = await supabaseAdmin
      .from('incidents')
      .select('id, created_at, acknowledged_at, assigned_at')
      .eq('id', incidentId)
      .single()
    if (incidentErr) throw incidentErr
    if (!incident) return { success: false, error: 'ไม่พบเอกสาร Incident' }

    const lowerBoundRaw = incident.acknowledged_at || incident.assigned_at || incident.created_at
    const lowerBound = toSafeDate(lowerBoundRaw)
    if (!lowerBound) return { success: false, error: 'ไม่พบเวลาเริ่มต้นของ Incident สำหรับตรวจสอบ SLA Exclusion' }
    if (startDt < lowerBound) {
      return { success: false, error: 'เวลาเริ่มต้นต้องไม่ก่อนเวลาเริ่มต้น SLA ของ Incident' }
    }
    if (endDt && endDt < lowerBound) {
      return { success: false, error: 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่มต้น SLA ของ Incident' }
    }

    const { data: existing } = await supabaseAdmin
      .from('incident_exclusions')
      .select('id, start_time, end_time')
      .eq('incident_id', incidentId)
    const hasActive = (existing || []).some((ex) => !ex.end_time)
    if (hasActive && !endTime) {
      return { success: false, error: 'มีช่วง SLA Exclusion ที่ยังไม่ปิดอยู่แล้ว' }
    }

    const candidateEnd = endDt || now
    const overlap = (existing || []).some((ex) => {
      const exStart = toSafeDate(ex.start_time)
      const exEnd = toSafeDate(ex.end_time) || now
      if (!exStart || !exEnd) return false
      return isRangeOverlap(startDt, candidateEnd, exStart, exEnd)
    })
    if (overlap) {
      return { success: false, error: 'ช่วงเวลาซ้อนกับ SLA Exclusion เดิม กรุณาแก้ช่วงเวลาใหม่' }
    }

    const { error: insertErr } = await supabaseAdmin.from('incident_exclusions').insert({
      incident_id: incidentId,
      reason_id: reason.id,
      start_time: startTime,
      end_time: endTime,
      notes: notes || null,
    })
    if (insertErr) throw insertErr

    await recordLog(
      incidentId,
      'incident',
      'เพิ่ม SLA Exclusion (Manual)',
      `Reason: ${reason.value} | Start: ${startTime}${endTime ? ` | End: ${endTime}` : ''}${notes ? ` | Notes: ${notes}` : ''}`,
      actor.email || session.user.email || 'system@internal'
    )

    return { success: true }
  } catch (err) {
    console.error('createIncidentExclusionManual Error:', err)
    return { success: false, error: err.message }
  }
}

export async function closeIncidentExclusionManual(payload) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const exclusionId = payload?.exclusion_id
    const endTime = payload?.end_time
    if (!exclusionId) return { success: false, error: 'ไม่พบ Exclusion ID' }
    if (!endTime) return { success: false, error: 'กรุณาระบุเวลาสิ้นสุด' }
    const endDt = toSafeDate(endTime)
    if (!endDt) return { success: false, error: 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง' }
    if (endDt > new Date()) return { success: false, error: 'เวลาสิ้นสุดต้องไม่เป็นเวลาในอนาคต' }

    const supabaseAdmin = getAdminClient()
    const { data: actor } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, email, is_active')
      .eq('id', session.user.id)
      .single()

    if (!actor || actor.is_active !== true) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งาน' }
    if (!['admin', 'it_staff'].includes(actor.role)) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ปิด SLA Exclusion' }
    }

    const { data: ex, error: exErr } = await supabaseAdmin
      .from('incident_exclusions')
      .select('id, incident_id, start_time, end_time')
      .eq('id', exclusionId)
      .single()
    if (exErr) throw exErr
    if (!ex) return { success: false, error: 'ไม่พบข้อมูล SLA Exclusion' }
    if (ex.end_time) return { success: false, error: 'ช่วงนี้ถูกปิดไปแล้ว' }
    if (endDt <= new Date(ex.start_time)) {
      return { success: false, error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('incident_exclusions')
      .update({ end_time: endTime })
      .eq('id', exclusionId)
      .is('end_time', null)
    if (updateErr) throw updateErr

    await recordLog(
      ex.incident_id,
      'incident',
      'ปิด SLA Exclusion (Manual)',
      `Exclusion ID: ${exclusionId} | End: ${endTime}`,
      actor.email || session.user.email || 'system@internal'
    )

    return { success: true }
  } catch (err) {
    console.error('closeIncidentExclusionManual Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getIncidentMasterData() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('master_data')
      .select('id, type, value, is_active, sort_order')
      .eq('is_active', true)
      .in('type', ['incident_category', 'affected_system', 'sla_exclusion_reason'])
      .order('sort_order', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: {
        categories: (data || []).filter(d => d.type === 'incident_category').map(d => d.value),
        systems: (data || []).filter(d => d.type === 'affected_system').map(d => d.value),
        exclusionReasons: (data || []).filter(d => d.type === 'sla_exclusion_reason'),
      }
    }
  } catch (err) {
    console.error('getIncidentMasterData Error:', err)
    return { success: false, error: err.message }
  }
}
