import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { processPublicApprovalLinkAction, recordSystemError } from '@/app/actions/workflow'

const SESSION_COOKIE_MAX_AGE_SECONDS = 15 * 60
const PUBLIC_APPROVAL_SESSION_COOKIE_PREFIX = 'dowa_approval_session'

const sha256 = (value) => createHash('sha256').update(String(value || '')).digest('hex')
const buildSessionCookieName = (tokenId) => `${PUBLIC_APPROVAL_SESSION_COOKIE_PREFIX}_${tokenId}`
const normalizeDocumentType = (value) => {
  const lowered = String(value || '').toLowerCase()
  if (lowered === 'incident_report') return 'incident'
  if (lowered === 'it_checklist') return 'checklist'
  return lowered
}

async function loadDocumentContext(adminClient, tokenRecord) {
  const documentType = normalizeDocumentType(tokenRecord?.document_type)
  if (!tokenRecord?.document_id || !documentType) return null

  if (documentType === 'incident') {
    const { data, error } = await adminClient
      .from('incidents')
      .select('description, root_cause, resolution, corrective_action, severity, reported_by, reporter_email')
      .eq('id', tokenRecord.document_id)
      .maybeSingle()
    if (error) throw error
    return data || null
  }

  if (documentType === 'checklist') {
    const { data, error } = await adminClient
      .from('checklist_docs')
      .select('freq_type, period_date, notes')
      .eq('id', tokenRecord.document_id)
      .maybeSingle()
    if (error) throw error
    return data || null
  }

  return null
}

async function loadTokenRecord(adminClient, rawToken) {
  const tokenHash = sha256(rawToken)
  const { data, error } = await adminClient
    .from('approval_tokens')
    .select('*')
    .or(`token_hash.eq.${tokenHash},token.eq.${rawToken}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

function buildInvalidStateResponse(tokenRecord) {
  if (!tokenRecord) return Response.json({ error: 'Token not found' }, { status: 404 })
  if (tokenRecord.revoked_at) {
    return Response.json({
      error: 'ลิงก์นี้ถูกยกเลิกแล้ว กรุณาขอให้ผู้ส่งส่งลิงก์ใหม่',
      revoked: true,
      revokedReason: tokenRecord.revoked_reason || null,
    }, { status: 410 })
  }
  if (tokenRecord.used_at) {
    return Response.json({
      error: 'ลิงก์นี้ถูกใช้งานเสร็จสิ้นแล้ว',
      action: tokenRecord.action,
      used_at: tokenRecord.used_at,
    }, { status: 409 })
  }
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return Response.json({
      error: 'ลิงก์อนุมัตินี้หมดอายุแล้ว กรุณาขอให้ผู้ส่งส่งลิงก์ใหม่',
      isExpired: true,
      expires_at: tokenRecord.expires_at,
    }, { status: 410 })
  }
  return null
}

async function ensureStepStillPending(adminClient, tokenRecord) {
  if (!tokenRecord?.step_id) return true
  const { data: step, error } = await adminClient
    .from('document_approvals')
    .select('status')
    .eq('id', tokenRecord.step_id)
    .maybeSingle()
  if (error) throw error
  return step?.status === 'pending'
}

async function attachOrValidateSession(adminClient, tokenRecord) {
  const cookieStore = await cookies()
  const cookieName = buildSessionCookieName(tokenRecord.id)
  const existingCookie = cookieStore.get(cookieName)?.value || ''
  const hashedExistingCookie = existingCookie ? sha256(existingCookie) : ''

  if (tokenRecord.consumed_at) {
    const sessionExpired = tokenRecord.session_expires_at && new Date(tokenRecord.session_expires_at) < new Date()
    if (!existingCookie || !tokenRecord.session_hash || hashedExistingCookie !== tokenRecord.session_hash || sessionExpired) {
      return {
        ok: false,
        response: Response.json({
          error: 'ลิงก์นี้ถูกเปิดใช้งานไปแล้วใน session อื่น กรุณาขอให้ผู้ส่งส่งลิงก์ใหม่',
          consumed: true,
          consumed_at: tokenRecord.consumed_at,
        }, { status: 409 }),
      }
    }

    return { ok: true, cookieName, sessionValue: existingCookie, consumed: true }
  }

  const sessionValue = randomBytes(32).toString('hex')
  const sessionHash = sha256(sessionValue)
  const nowIso = new Date().toISOString()
  const { data: updated, error } = await adminClient
    .from('approval_tokens')
    .update({
      consumed_at: nowIso,
      session_hash: sessionHash,
      session_expires_at: tokenRecord.expires_at,
    })
    .eq('id', tokenRecord.id)
    .is('consumed_at', null)
    .select('*')
    .maybeSingle()

  if (error) throw error

  if (!updated) {
    const latestRecord = await loadTokenRecord(adminClient, tokenRecord.token)
    return attachOrValidateSession(adminClient, latestRecord)
  }

  cookieStore.set(cookieName, sessionValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.min(
      SESSION_COOKIE_MAX_AGE_SECONDS,
      Math.max(60, Math.floor((new Date(updated.expires_at).getTime() - Date.now()) / 1000))
    ),
  })

  return { ok: true, cookieName, sessionValue, consumed: false }
}

function buildTokenPayload(tokenRecord, documentContext = null) {
  return {
    document_id: tokenRecord.document_id,
    document_type: normalizeDocumentType(tokenRecord.document_type),
    document_title: tokenRecord.document_title,
    document_no: tokenRecord.doc_no || tokenRecord.document_id,
    approver_name: tokenRecord.approver_name,
    approver_email: tokenRecord.approver_email,
    expires_at: tokenRecord.expires_at,
    used_at: tokenRecord.used_at,
    action: tokenRecord.action,
    step_order: tokenRecord.step_order || null,
    consumed_at: tokenRecord.consumed_at || null,
    document_context: documentContext,
  }
}

export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

    const adminClient = getSupabaseAdmin()
    const tokenRecord = await loadTokenRecord(adminClient, token)
    const invalid = buildInvalidStateResponse(tokenRecord)
    if (invalid) return invalid

    const stepPending = await ensureStepStillPending(adminClient, tokenRecord)
    if (!stepPending) {
      return Response.json({ error: 'ขั้นตอนอนุมัตินี้ถูกดำเนินการไปแล้ว' }, { status: 409 })
    }

    const sessionResult = await attachOrValidateSession(adminClient, tokenRecord)
    if (!sessionResult.ok) return sessionResult.response
    const documentContext = await loadDocumentContext(adminClient, tokenRecord)

    return Response.json({
      ...buildTokenPayload(tokenRecord, documentContext),
      mode: 'active',
      consumed: sessionResult.consumed,
    })
  } catch (err) {
    await recordSystemError('API', `Approval Verify GET failed: ${err.message}`, { error: err })
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { token, action, comment } = await request.json()

    if (!token || !action) {
      return Response.json({ error: 'Missing token or action' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()
    const tokenRecord = await loadTokenRecord(adminClient, token)
    const invalid = buildInvalidStateResponse(tokenRecord)
    if (invalid) return invalid

    const cookieStore = await cookies()
    const cookieName = buildSessionCookieName(tokenRecord.id)
    const sessionCookie = cookieStore.get(cookieName)?.value || ''
    if (!sessionCookie || !tokenRecord.session_hash || sha256(sessionCookie) !== tokenRecord.session_hash) {
      return Response.json({
        error: 'Session ของลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่',
      }, { status: 409 })
    }

    const stepPending = await ensureStepStillPending(adminClient, tokenRecord)
    if (!stepPending) {
      return Response.json({ error: 'ขั้นตอนอนุมัตินี้ถูกดำเนินการไปแล้ว' }, { status: 409 })
    }

    const result = await processPublicApprovalLinkAction({
      tokenRecord,
      action,
      comment,
    })

    if (!result?.success) {
      return Response.json({ error: result?.error || 'ไม่สามารถดำเนินการอนุมัติได้' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const updatePayload = {
      action,
      comment: comment || null,
      used_at: nowIso,
      approved_at: action === 'approved' ? nowIso : null,
      session_expires_at: nowIso,
    }

    const { error: updateError } = await adminClient
      .from('approval_tokens')
      .update(updatePayload)
      .eq('id', tokenRecord.id)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    cookieStore.set(cookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    return Response.json({
      success: true,
      action,
      documentId: tokenRecord.document_id,
      documentType: normalizeDocumentType(tokenRecord.document_type),
      documentTitle: tokenRecord.document_title,
      isFinal: Boolean(result?.isFinal),
    })
  } catch (err) {
    await recordSystemError('API', `Approval Verify POST failed: ${err.message}`, { error: err })
    return Response.json({ error: err.message }, { status: 500 })
  }
}
