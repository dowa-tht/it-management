import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import bcrypt from 'bcryptjs'

// POST /api/guest/reset-pin
export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'กรุณากรอก Email' }, { status: 400 })

    const adminClient = getSupabaseAdmin()

    // 1. ตรวจสอบว่ามี Guest นี้จริงไหม
    const { data: guest, error } = await adminClient
      .from('external_users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !guest) {
      // เพื่อความปลอดภัย ไม่ควรบอกว่าไม่พบ email จริงๆ 
      // แต่ในระบบปิดแบบนี้ บอกไปเพื่อความสะดวกได้ครับ
      return Response.json({ error: 'ไม่พบข้อมูลบัญชี Guest นี้ในระบบ' }, { status: 404 })
    }

    // 2. สุ่ม PIN ใหม่ 6 หลัก
    const newPin = Math.floor(100000 + Math.random() * 900000).toString()
    const pinHash = await bcrypt.hash(newPin, 10)

    // 3. อัปเดตในฐานข้อมูล
    const { error: updateError } = await adminClient
      .from('external_users')
      .update({ pin_hash: pinHash })
      .eq('id', guest.id)

    if (updateError) return Response.json({ error: updateError.message }, { status: 400 })

    // 4. ส่ง Email แจ้ง PIN ใหม่
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error: emailError } = await resend.emails.send({
      from: 'DOWA IT System <no-reply@dowa-it.com>',
      to: email,
      subject: '[DOWA IT] รหัส PIN ใหม่ของคุณสำหรับ Guest Access',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:16px">
          <h2 style="color:#2563eb">🔐 รหัส PIN ใหม่ของคุณ</h2>
          <p>เรียน คุณ${guest.full_name},</p>
          <p>คุณได้ทำการขอรีเซ็ตรหัส PIN สำหรับเข้าใช้งานระบบ DOWA IT ในฐานะ Guest</p>
          <div style="background:#f1f5f9;padding:24px;text-align:center;border-radius:12px;margin:20px 0">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1e293b">${newPin}</span>
          </div>
          <p style="color:#ef4444;font-size:13px"><b>ข้อควรระวัง:</b> กรุณาเปลี่ยน PIN หรือเก็บรักษาเป็นความลับ และรหัสนี้มีผลทันที</p>
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0" />
          <p style="font-size:12px;color:#94a3b8">
            หากคุณไม่ได้เป็นผู้ร้องขอ กรุณาติดต่อฝ่าย IT ทันที
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Email error:', emailError)
      return Response.json({ error: 'เปลี่ยน PIN สำเร็จแต่ส่งอีเมลไม่สำเร็จ' }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
