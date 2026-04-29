import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeRole } from '@/lib/auth'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', session.user.id).single()
  if (normalizeRole(profile?.role) !== 'administrator') return null
  return session.user
}

// POST /api/approval/send
// ส่ง Approval Link ทาง Email ให้ผู้อนุมัติ
export async function POST(request) {
  try {
    const caller = await requireAdmin()
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, documentType, documentTitle, approverEmail, approverName } =
      await request.json()

    if (!documentId || !documentType || !approverEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()

    // ค้นหา external_user ที่ตรงกับ email นี้ (ถ้ามี)
    const { data: extUser } = await adminClient
      .from('external_users')
      .select('id')
      .eq('email', approverEmail)
      .single()

    // สร้าง token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { data: tokenData, error: tokenError } = await adminClient
      .from('approval_tokens')
      .insert({
        document_id: documentId,
        document_type: documentType,
        document_title: documentTitle || 'เอกสาร',
        approver_email: approverEmail,
        approver_name: approverName || approverEmail,
        external_user_id: extUser?.id || null,
        expires_at: expiresAt.toISOString(),
        created_by: caller.id,
      })
      .select('token')
      .single()

    if (tokenError) return Response.json({ error: tokenError.message }, { status: 400 })

    const approvalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/approve?token=${tokenData.token}`

    // ส่ง Email ผ่าน Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error: emailError } = await resend.emails.send({
      from: 'DOWA IT System <no-reply@dowa-it.com>',
      to: approverEmail,
      subject: `[อนุมัติ] ${documentTitle || 'เอกสาร IT'}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#1d4ed8">🔔 ขอความอนุมัติจากระบบ DOWA IT</h2>
          <p>เรียน คุณ${approverName || approverEmail},</p>
          <p>มีเอกสาร <strong>${documentTitle || 'เอกสาร IT'}</strong> ที่รอการอนุมัติจากคุณ</p>
          <p>กรุณากดปุ่มด้านล่างเพื่ออนุมัติหรือปฏิเสธ:</p>
          <a href="${approvalUrl}"
             style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            ✅ ดูและอนุมัติเอกสาร
          </a>
          <p style="font-size:12px;color:#6b7280">
            ลิงก์นี้จะหมดอายุใน 7 วัน (${expiresAt.toLocaleDateString('th-TH')})<br>
            หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      // ไม่ fail — token สร้างแล้ว แต่ Email อาจส่งไม่ได้
      return Response.json({
        success: true,
        warning: 'Token created but email failed to send',
        approvalUrl,
      })
    }

    return Response.json({ success: true, approvalUrl })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
