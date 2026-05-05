import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies })
  const { userId, pin } = await req.json()

  // 1. Fetch user profile
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('signature_pin, pin_attempts, pin_locked_until')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 })
  }

  // 2. Check if currently locked
  if (user.pin_locked_until) {
    const lockedUntil = new Date(user.pin_locked_until)
    if (lockedUntil > new Date()) {
      return NextResponse.json({ 
        success: false, 
        error: `บัญชีถูกระงับชั่วคราว กรุณาลองใหม่หลังจาก ${lockedUntil.toLocaleTimeString()}` 
      }, { status: 403 })
    }
  }

  // 3. Verify PIN
  const isValid = await bcrypt.compare(pin, user.signature_pin)

  if (isValid) {
    // SUCCESS: Reset attempts and lock
    await supabase
      .from('user_profiles')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', userId)

    return NextResponse.json({ success: true })
  } else {
    // FAILURE: Increment attempts
    const newAttempts = (user.pin_attempts || 0) + 1
    let updateData = { pin_attempts: newAttempts }

    if (newAttempts >= 5) {
      const lockUntil = new Date()
      lockUntil.setMinutes(lockUntil.getMinutes() + 15) // Lock for 15 mins
      updateData.pin_locked_until = lockUntil.toISOString()
    }

    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)

    const remaining = 5 - newAttempts
    return NextResponse.json({ 
      success: false, 
      error: newAttempts >= 5 
        ? 'คุณกรอกรหัสผิดครบ 5 ครั้ง ระบบถูกระงับ 15 นาที' 
        : `รหัส PIN ไม่ถูกต้อง (เหลือโอกาสอีก ${remaining} ครั้ง)` 
    }, { status: 401 })
  }
}
