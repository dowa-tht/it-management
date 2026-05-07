import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * 🕵️ DOWA IT Global Gatekeeper (Proxy Standard - Next.js 16)
 * 
 * กฎ: Proxy ทำหน้าที่เฉพาะป้องกัน /dashboard เท่านั้น
 * - ไม่แตะ / (Login page) — ให้ client-side จัดการ
 * - ไม่แตะ /onboarding — ให้ page จัดการ
 * - ป้องกันเฉพาะ /dashboard ที่ไม่มี session หรือยังไม่ onboard
 */
export async function proxy(request) {
  let response = NextResponse.next()
  const { pathname } = request.nextUrl

  // ผ่านทุก path ยกเว้น /dashboard
  if (!pathname.startsWith('/dashboard')) {
    return response
  }

  // ตั้งค่า supabase client สำหรับอ่าน session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // ไม่มี session -> กลับ Login
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // มี session แต่ยังไม่ Onboard (เช็ค Cookie ก่อน)
  const isOnboarded = request.cookies.get('dowa_onboarded')?.value === 'true'
  if (isOnboarded) {
    return response // ผ่านได้เลย
  }

  // Cookie ไม่มี หรือ false -> เช็ค DB
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_onboarded')
    .eq('id', session.user.id)
    .single()

  if (profile?.is_onboarded) {
    // ✅ Onboard แล้ว -> fix Cookie แล้วผ่าน
    response.cookies.set('dowa_onboarded', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return response
  }

  // ❌ ยังไม่ Onboard -> ส่งไป API สร้าง token แล้วไป onboarding
  return NextResponse.redirect(new URL('/api/onboarding/init', request.url))
}

export default proxy

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
