import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * 🕵️ DOWA IT Global Gatekeeper (Proxy Standard - Next.js 16)
 * มาตรฐานความปลอดภัยระดับ Audit (Zero-Hack Policy)
 * เปลี่ยนจาก middleware เป็น proxy ตามมาตรฐานใหม่ของ Next.js 16
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

  // 1. ตรวจสอบ Session เบื้องต้น
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl
  
  // 2. ตรวจสอบ Onboarding Cookie (มาตรฐานความเร็วสูง)
  const isOnboarded = request.cookies.get('dowa_onboarded')?.value === 'true'

  // --- Logic การ Redirect ---

  // A. หากล็อกอินแล้วแต่ยังไม่ทำ Onboarding -> บังคับไปหน้า Onboarding
  if (session && !isOnboarded) {
    const isPublicPath = 
      pathname === '/' || 
      pathname.startsWith('/auth') || 
      pathname.startsWith('/onboarding') || 
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/reset-pin') ||
      pathname.startsWith('/access-denied')

    if (!isPublicPath && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // B. หากยังไม่ได้ล็อกอิน แต่จะเข้าหน้า Dashboard -> ดีดกลับหน้า Login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // C. หากล็อกอินแล้ว แต่จะเข้าหน้า Login -> ดีดไป Dashboard (หรือ Onboarding)
  if (session && pathname === '/') {
    const target = isOnboarded ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(new URL(target, request.url))
  }

  return response
}

// Named export 'proxy' is required in Next.js 16
export default proxy

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
