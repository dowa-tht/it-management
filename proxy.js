import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { canAccess, normalizeRole } from '@/lib/auth'

/**
 * Next.js 16 Proxy (formerly Middleware)
 * Optimized with Role Caching to reduce Supabase DB queries.
 */
/**
 * Next.js 16 Proxy (formerly Middleware)
 * Optimized with Role Caching to reduce Supabase DB queries.
 */
export default async function proxy(req) {
  const pathname = req.nextUrl.pathname

  const res = NextResponse.next()

  // 1. Skip public routes
  const publicPaths = ['/', '/approve', '/guest-access', '/reset-pin']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '?'))) {
    return res
  }

  // 2. Only protect /dashboard and other sensitive routes
  const protectedRoutes = ['/dashboard', '/approve', '/guest-access', '/reset-pin']
  if (!protectedRoutes.some(p => pathname.startsWith(p))) return res

  // 3. Initialize Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 4. Get Supabase Session (Tier 1/2)
  const { data: { session } } = await supabase.auth.getSession()

  // 5. If no Supabase Session, check Guest Session (Tier 4)
  if (!session) {
    const guestSession = req.cookies.get('guest-session')?.value
    if (guestSession) {
      try {
        const guestData = JSON.parse(atob(guestSession))
        if (guestData.exp > Date.now()) {
          if (canAccess('guest', pathname)) return res
          return NextResponse.redirect(new URL('/dashboard?error=access_denied', req.url))
        }
      } catch (e) {
        const response = NextResponse.redirect(new URL('/?error=invalid_session', req.url))
        response.cookies.delete('guest-session')
        return response
      }
    }
    return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
  }

  // 6. Role Caching Logic
  // Check if we have the role cached in a cookie to avoid DB query
  let role = req.cookies.get('user-role-cache')?.value

  if (!role) {
    // Cache miss -> Query Database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    role = normalizeRole(profile?.role)
    
    // Set cache cookie (expires in 1 hour for security/freshness)
    res.cookies.set('user-role-cache', role, { maxAge: 3600, path: '/' })
  }

  // 7. Access Control
  const isAllowed = canAccess(role, pathname)
  
  if (!isAllowed) {
    const redirectUrl = new URL('/?error=access_denied', req.url)
    return NextResponse.redirect(redirectUrl)
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
