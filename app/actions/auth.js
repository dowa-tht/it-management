'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Move heavy node-only imports inside functions or use require if needed
// to prevent issues in specific environments

export async function unifiedLogin(email, password) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 1. ลอง Login ด้วย Supabase Auth ก่อน (Tier 1-2)
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (!authError) {
    return { success: true, type: 'internal' }
  }

  // 2. ถ้าล้มเหลว ลองเช็คในระบบ External PIN (Tier 3-4)
  const bcrypt = require('bcryptjs')
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: extUser, error: extError } = await adminClient
    .from('external_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (extUser && await bcrypt.compare(password, extUser.pin_hash)) {
    // สร้าง Guest Session Data พร้อม Exp (24 ชั่วโมงจากนี้)
    const sessionData = {
      id: extUser.id,
      email: extUser.email,
      role: extUser.role,
      name: extUser.full_name,
      exp: Date.now() + (60 * 60 * 24 * 1000)
    }

    // เข้ารหัสเป็น Base64 เพื่อให้ Middleware อ่านได้ (atob)
    const encodedData = Buffer.from(JSON.stringify(sessionData)).toString('base64')

    // สร้าง Guest Session Cookie
    cookieStore.set('guest-session', encodedData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    
    return { success: true, type: 'external' }
  }

  return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
}

export async function checkUserTier(email) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: 'ระบบขัดข้อง: กรุณาตั้งค่า Environment Variables (Missing URL/Key)' }
    }
    
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: registry, error } = await adminClient
      .from('user_registry')
      .select('user_role')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !registry) return { success: true, tier: 'not_found' }

    const role = registry.user_role
    if (['administrator', 'supervisor'].includes(role)) {
      return { success: true, tier: 'internal', role }
    } else if (['approval', 'guest'].includes(role)) {
      return { success: true, tier: 'external', role }
    }

    return { success: true, tier: 'not_found' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function getCurrentUserSession() {
  const cookieStore = await cookies()
  const guestSession = cookieStore.get('guest-session')
  
  if (guestSession) {
    try {
      const decoded = JSON.parse(Buffer.from(guestSession.value, 'base64').toString('utf8'))
      // ตรวจสอบวันหมดอายุ
      if (decoded.exp > Date.now()) {
        return { type: 'external', user: decoded }
      }
    } catch (e) {
      console.error('Invalid guest session cookie')
    }
  }
  
  // ถ้าไม่มี Guest Session ให้ลองเช็ค Supabase Auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return { type: 'internal', user: user }
  }
  
  return null
}

export async function changeExternalPIN({ currentPIN, newPIN }) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'external') {
      throw new Error('กรุณาเข้าสู่ระบบด้วย PIN ก่อน')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, serviceKey)

    // 1. ดึงข้อมูล User ปัจจุบัน
    const { data: extUser, error: findError } = await adminClient
      .from('external_users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (findError || !extUser) throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')

    // 2. ตรวจสอบ PIN เดิม
    const isPinValid = await bcrypt.compare(currentPIN, extUser.pin_hash)
    if (!isPinValid) {
      throw new Error('PIN เดิมไม่ถูกต้อง')
    }

    // 3. Hash PIN ใหม่
    const bcrypt = require('bcryptjs')
    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(newPIN, salt)

    // 4. อัปเดตลงตาราง external_users
    const { error: updateError } = await adminClient
      .from('external_users')
      .update({ pin_hash: pinHash })
      .eq('id', extUser.id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err) {
    console.error('changeExternalPIN error:', err)
    return { success: false, error: err.message }
  }
}
