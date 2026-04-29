'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@supabase/ssr'

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
