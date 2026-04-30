'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function unifiedLogin(email, password) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey || !serviceKey) {
    return { success: false, error: 'Missing Configuration' }
  }

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
  // Use a lightweight check first
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: extUser } = await adminClient
    .from('external_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (extUser) {
    const bcrypt = require('bcryptjs')
    if (await bcrypt.compare(password, extUser.pin_hash)) {
      // Create session...
      const sessionData = {
        id: extUser.id,
        email: extUser.email,
        role: extUser.role,
        name: extUser.full_name,
        exp: Date.now() + (60 * 60 * 24 * 1000)
      }
      const encodedData = Buffer.from(JSON.stringify(sessionData)).toString('base64')
      cookieStore.set('guest-session', encodedData, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24
      })
      return { success: true, type: 'external' }
    }
  }

  return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
}
