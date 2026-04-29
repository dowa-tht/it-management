import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { canAccess, normalizeRole } from '@/lib/auth'

export async function middleware(req) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // ข้าม public routes ที่ไม่ต้อง Auth
  const publicPaths = ['/', '/approve', '/guest-access', '/reset-pin']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '?'))) {
    return res
  }

  // ตรวจสอบเฉพาะ /dashboard routes
  if (!pathname.startsWith('/dashboard')) return res

  // สร้าง Supabase client สำหรับ Middleware (ใช้ @supabase/ssr)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ดึง Session ของ Tier 1 (Supabase Auth)
  const { data: { session } } = await supabase.auth.getSession()

  // ไม่มี Session → redirect ไปหน้า Login
  if (!session) {
    // ตรวจสอบ Guest Token ใน Cookie ก่อน (Tier 2)
    const guestToken = req.cookies.get('guest_token')?.value
    if (guestToken) {
      // ให้ผ่านไปก่อน — Client-side จะตรวจสอบ Token เองใน layout
      return res
    }
    return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
  }

  // ดึง Role จาก user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = normalizeRole(profile?.role)

  // ตรวจสอบสิทธิ์เข้าถึง
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(
      new URL('/dashboard?error=access_denied', req.url)
    )
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/approve/:path*',
    '/guest-access/:path*',
    '/reset-pin/:path*',
  ],
}
