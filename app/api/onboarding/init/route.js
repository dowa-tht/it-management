import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 🛡️ Onboarding Init API
 * ทำหน้าที่ generate/fetch onboarding token แล้ว redirect ไปหน้า /onboarding?token=...
 * ต้องใช้ Service Role Key เพื่อเขียน DB ได้
 */
export async function GET(request) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // ตรวจสอบ session ด้วย anon client (อ่านได้)
  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })

  const { data: { session } } = await supabaseAuth.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ใช้ admin client เพื่อ read + write user_profiles
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('is_onboarded, onboarding_token, onboarding_token_expires')
    .eq('id', session.user.id)
    .single()

  // ถ้า Onboard แล้วให้ไป Dashboard
  if (profile?.is_onboarded) {
    const res = NextResponse.redirect(new URL('/dashboard', request.url))
    res.cookies.set('dowa_onboarded', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return res
  }

  // ตรวจสอบ / สร้าง Token
  let token = profile?.onboarding_token

  if (!token) {
    const { randomUUID } = await import('crypto')
    token = randomUUID()
    const { error } = await adminClient
      .from('user_profiles')
      .update({ onboarding_token: token })
      .eq('id', session.user.id)
    
    if (error) {
      console.error('❌ Failed to save onboarding token:', error)
      return NextResponse.redirect(new URL('/?error=token_failed', request.url))
    }
    console.log(`✅ Generated new onboarding token for user ${session.user.id}`)
  }

  return NextResponse.redirect(new URL(`/onboarding?token=${token}`, request.url))
}
