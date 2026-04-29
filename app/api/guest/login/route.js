import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

// POST /api/guest/login
export async function POST(request) {
  try {
    const { email, pin } = await request.json()

    if (!email || !pin) {
      return Response.json({ error: 'กรุณากรอก Email และ PIN' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()

    // 1. ค้นหา Guest ใน external_users
    const { data: guest, error } = await adminClient
      .from('external_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !guest) {
      return Response.json({ error: 'ไม่พบข้อมูล Guest หรือบัญชีถูกระงับ' }, { status: 404 })
    }

    // 2. ตรวจสอบวันหมดอายุ
    if (new Date(guest.expires_at) < new Date()) {
      return Response.json({ error: 'บัญชี Guest นี้หมดอายุการใช้งานแล้ว' }, { status: 403 })
    }

    // 3. ตรวจสอบ PIN (bcrypt)
    const isPinValid = await bcrypt.compare(pin, guest.pin_hash)
    if (!isPinValid) {
      return Response.json({ error: 'PIN ไม่ถูกต้อง' }, { status: 401 })
    }

    // 4. สร้าง Guest Session (ในที่นี้เราจะใช้ Cookie พิเศษ)
    // หมายเหตุ: ในระบบจริง เราอาจจะใช้ Supabase Auth sign-in ด้วย account กลาง 
    // หรือสร้าง JWT ของเราเอง ในที่นี้ผมจะเซ็ต cookie เพื่อให้ middleware ตรวจสอบ
    const cookieStore = await cookies()
    const guestData = {
      id: guest.id,
      email: guest.email,
      role: 'guest',
      name: guest.full_name,
      exp: new Date(guest.expires_at).getTime()
    }
    
    // เข้ารหัสแบบง่าย (ใน production ควรใช้ JWT + Secret)
    const sessionToken = btoa(JSON.stringify(guestData))
    
    cookieStore.set('guest-session', sessionToken, {
      expires: new Date(guest.expires_at),
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
