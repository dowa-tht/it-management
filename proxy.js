import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * 🕵️ DOWA IT Global Gatekeeper (Proxy Standard - Next.js 16)
 * มาตรฐานความปลอดภัยระดับ Audit (Zero-Hack Policy)
 *
 * หลักการ:
 * - Proxy อ่านได้อย่างเดียว (ANON_KEY) ห้ามเขียน DB โดยตรง
 * - การ generate/refresh token ให้ทำผ่าน /api/onboarding/init (Service Role)
 */
export async function proxy(request) {
  let response = NextResponse.next()

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
  const { pathname } = request.nextUrl

  // ไม่แตะ path เหล่านี้เลย (แต่เอา / ออกเพื่อตรวจ session ก่อน)
  const isAlwaysAllowed =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/reset-pin') ||
    pathname.startsWith('/access-denied') ||
    pathname.startsWith('/api/onboarding')

  if (isAlwaysAllowed) {
    return response
  }

  // --- Logic สำหรับหน้าแรก (/) ---
  if (pathname === '/') {
    // ถ้าไม่มี session ให้แสดงหน้า Login ปกติ
    if (!session) return response

    // ถ้ามี session แล้ว ให้เช็คสถานะ Onboarding
    if (isOnboarded) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ถ้า Cookie บอกว่ายังไม่ Onboard ให้เช็ค DB เพื่อความชัวร์ (กัน Cookie stale)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_onboarded')
      .eq('id', session.user.id)
      .single()

    if (profile?.is_onboarded) {
      // ✅ ใน DB บอกว่า Onboard แล้ว -> อัปเดต Cookie และไป Dashboard
      response.cookies.set('dowa_onboarded', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      return NextResponse.redirect(new URL('/dashboard', request.url), {
        headers: response.headers
      })
    }

    // ❌ ยังไม่ Onboard จริง -> ส่งไป Init Token
    return NextResponse.redirect(new URL('/api/onboarding/init', request.url))
  }

  // ตรวจสอบ Onboarding Cookie (อ่านเร็ว, ไม่ query DB)
  const isOnboarded = request.cookies.get('dowa_onboarded')?.value === 'true'

  // --- ป้องกันการเข้า Dashboard ---

  // B. ไม่มี session -> กลับไป Login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // A. มี session แต่ Cookie บอกว่ายังไม่ Onboard
  if (session && !isOnboarded && pathname.startsWith('/dashboard')) {
    // เช็ค DB ก่อน (กัน Cookie stale)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_onboarded')
      .eq('id', session.user.id)
      .single()

    if (profile?.is_onboarded) {
      // DB บอกว่า Onboard แล้ว -> แก้ Cookie แล้วผ่านได้เลย
      response.cookies.set('dowa_onboarded', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      return response
    }

    // ยังไม่ Onboard จริง -> ให้ API route จัดการ token แล้ว redirect
    return NextResponse.redirect(new URL('/api/onboarding/init', request.url))
  }

  return response
}

export default proxy

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
