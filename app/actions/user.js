'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getCurrentUserSession() {
  const cookieStore = await cookies()
  const guestSession = cookieStore.get('guest-session')
  
  if (guestSession) {
    try {
      const decoded = JSON.parse(Buffer.from(guestSession.value, 'base64').toString('utf8'))
      if (decoded.exp > Date.now()) {
        return { type: 'external', user: decoded }
      }
    } catch (e) {
      console.error('Invalid guest session cookie')
    }
  }
  
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

    const { data: extUser, error: findError } = await adminClient
      .from('external_users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (findError || !extUser) throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')

    const bcrypt = require('bcryptjs')
    const isPinValid = await bcrypt.compare(currentPIN, extUser.pin_hash)
    if (!isPinValid) {
      throw new Error('PIN เดิมไม่ถูกต้อง')
    }

    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(newPIN, salt)

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
