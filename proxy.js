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

  // A. หากล็อกอินแล้วแต่ยังไม่ทำ Onboarding -> ตรวจสอบให้แน่ใจ (Self-Healing Cookie)
  if (session && !isOnboarded) {
    const isPublicPath = 
      pathname === '/' || 
      pathname.startsWith('/auth') || 
      pathname.startsWith('/onboarding') || 
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/reset-pin') ||
      pathname.startsWith('/access-denied')

    // ถ้าจะเข้าหน้า Dashboard แต่ Cookie บอกว่ายังไม่ Onboard -> เช็ค DB อีกรอบเพื่อความชัวร์ (กัน Loop)
    if (!isPublicPath && pathname.startsWith('/dashboard')) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_onboarded')
        .eq('id', session.user.id)
        .single()

      if (profile?.is_onboarded) {
        // ✅ ใน DB บอกว่า Onboard แล้ว -> อัปเดต Cookie และให้ไปต่อได้เลย (แก้ Loop)
        response.cookies.set('dowa_onboarded', 'true', {
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
        return response
      }

      // ❌ ถ้าใน DB ก็ยังไม่ Onboard -> บังคับไปหน้า Onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // B. หากยังไม่ได้ล็อกอิน แต่จะเข้าหน้า Dashboard -> ดีดกลับหน้า Login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // C. หากล็อกอินแล้ว แต่จะเข้าหน้า Login -> ดีดไป Dashboard (หรือ Onboarding)
  if (session && pathname === '/') {
    let finalOnboarded = isOnboarded
    
    // ถ้า Cookie บอกว่ายังไม่ Onboard ให้เช็ค DB เพื่อความชัวร์ก่อนดีดไปหน้าอื่น
    if (!finalOnboarded) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_onboarded')
        .eq('id', session.user.id)
        .single()
      finalOnboarded = profile?.is_onboarded || false
      
      if (finalOnboarded) {
        response.cookies.set('dowa_onboarded', 'true', {
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
      }
    }

    const target = finalOnboarded ? '/dashboard' : '/onboarding'
    const redirectResponse = NextResponse.redirect(new URL(target, request.url))
    
    // ถ้าเราเพิ่งรู้ว่า Onboard แล้ว ให้แนบ Cookie ไปกับ Redirect ด้วย
    if (finalOnboarded && !isOnboarded) {
      redirectResponse.cookies.set('dowa_onboarded', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    }
    return redirectResponse
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
