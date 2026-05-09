import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

// POST /api/auditor/login
export async function POST(request) {
  try {
    const { email, pin } = await request.json()

    if (!email || !pin) {
      return Response.json({ error: 'กรุณากรอก Email และ PIN' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()

    // 1. ค้นหา Auditor ใน external_users
    const { data: auditor, error } = await adminClient
      .from('external_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !auditor) {
      return Response.json({ error: 'ไม่พบข้อมูล Auditor หรือบัญชีถูกระงับ' }, { status: 404 })
    }

    // 2. ตรวจสอบ Lockout
    if (auditor.pin_locked_until) {
      const lockedUntil = new Date(auditor.pin_locked_until)
      if (lockedUntil > new Date()) {
        return Response.json({ 
          error: `บัญชีถูกระงับชั่วคราว กรุณาลองใหม่หลังจาก ${lockedUntil.toLocaleTimeString()}` 
        }, { status: 403 })
      }
    }

    // 3. ตรวจสอบวันหมดอายุ
    if (new Date(auditor.expires_at) < new Date()) {
      return Response.json({ error: 'บัญชี Auditor นี้หมดอายุการใช้งานแล้ว' }, { status: 403 })
    }

    // 4. ตรวจสอบ PIN (bcrypt)
    const isPinValid = await bcrypt.compare(pin, auditor.pin_hash)
    
    if (isPinValid) {
      // SUCCESS: Reset attempts
      await adminClient
        .from('external_users')
        .update({ pin_attempts: 0, pin_locked_until: null, last_accessed_at: new Date().toISOString() })
        .eq('id', auditor.id)
    } else {
      // FAILURE: Increment attempts
      const newAttempts = (auditor.pin_attempts || 0) + 1
      let updateData = { pin_attempts: newAttempts }

      if (newAttempts >= 5) {
        const lockUntil = new Date()
        lockUntil.setMinutes(lockUntil.getMinutes() + 30) // Lock for 30 mins
        updateData.pin_locked_until = lockUntil.toISOString()
      }

      await adminClient
        .from('external_users')
        .update(updateData)
        .eq('id', auditor.id)

      const remaining = 5 - newAttempts
      return Response.json({ 
        error: newAttempts >= 5 
          ? 'คุณกรอก PIN ผิดครบ 5 ครั้ง ระบบถูกระงับ 30 นาที' 
          : `PIN ไม่ถูกต้อง (เหลือโอกาสอีก ${remaining} ครั้ง)` 
      }, { status: 401 })
    }

    // 5. สร้าง Auditor Session
    const cookieStore = await cookies()
    const auditorData = {
      id: auditor.id,
      email: auditor.email,
      role: auditor.role || 'auditor',
      name: auditor.full_name,
      exp: new Date(auditor.expires_at).getTime()
    }
    
    const sessionToken = Buffer.from(JSON.stringify(auditorData)).toString('base64')
    
    cookieStore.set('guest-session', sessionToken, {
      expires: new Date(auditor.expires_at),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return Response.json({ 
      success: true, 
      redirect: '/dashboard',
      guestName: guest.full_name 
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
