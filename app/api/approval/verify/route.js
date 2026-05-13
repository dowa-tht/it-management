import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { recordSystemError } from '@/app/actions/workflow'

// POST /api/approval/verify
// รับ token + action (approved/rejected) + comment แล้วบันทึกผล
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

    // ดึง token record
    const { data: tokenRecord, error: fetchError } = await adminClient
      .from('approval_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !tokenRecord) {
      return Response.json({ error: 'Token not found' }, { status: 404 })
    }

    // ตรวจสอบหมดอายุ
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ error: 'Token has expired' }, { status: 410 })
    }

    // ตรวจสอบว่าใช้ไปแล้วหรือยัง
    if (tokenRecord.used_at) {
      return Response.json({
        error: 'Token already used',
        action: tokenRecord.action,
      }, { status: 409 })
    }

    // บันทึกผลการอนุมัติ
    const { error: updateError } = await adminClient
      .from('approval_tokens')
      .update({
        action,
        comment: comment || null,
        used_at: new Date().toISOString(),
        approved_at: action === 'approved' ? new Date().toISOString() : null,
      })
      .eq('token', token)

    if (updateError) return Response.json({ error: updateError.message }, { status: 400 })

    return Response.json({
      success: true,
      action,
      documentId: tokenRecord.document_id,
      documentType: tokenRecord.document_type,
      documentTitle: tokenRecord.document_title,
    })
  } catch (err) {
    await recordSystemError('API', `Approval Verify POST failed: ${err.message}`, { error: err })
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/approval/verify?token=xxx — ดูข้อมูล token ก่อน approve
export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

    const adminClient = getSupabaseAdmin()
    const { data, error } = await adminClient
      .from('approval_tokens')
      .select('document_id, document_type, document_title, approver_name, expires_at, used_at, action')
      .eq('token', token)
      .single()

    if (error || !data) return Response.json({ error: 'Token not found' }, { status: 404 })

    const isExpired = new Date(data.expires_at) < new Date()
    return Response.json({ ...data, isExpired })
  } catch (err) {
    await recordSystemError('API', `Approval Verify GET failed: ${err.message}`, { error: err })
    return Response.json({ error: err.message }, { status: 500 })
  }
}
