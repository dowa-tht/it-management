import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { hashEmail } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  try {
    if (code) {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Exchange Error:', exchangeError.message)
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(exchangeError.message)}`)
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const user = session.user
        const emailHash = hashEmail(user.email)
        const supabaseAdmin = getSupabaseAdmin()
        
        const { data: whitelistEntry, error: wError } = await supabaseAdmin
          .from('user_whitelist')
          .select('id')
          .eq('email_hash', emailHash)
          .maybeSingle()

        if (user.email?.toLowerCase() === 'admin@dowa-tht.co.th' || (whitelistEntry && !wError)) {
          return NextResponse.redirect(`${origin}${next}`)
        } else {
          return NextResponse.redirect(`${origin}/access-denied?reason=not_whitelisted`)
        }
      }
    }
    return NextResponse.redirect(`${origin}/access-denied?reason=no_code_or_session`)
  } catch (err) {
    console.error('💥 Auth Callback Fatal Error:', err)
    // ส่ง Error กลับไปที่หน้าแรกเพื่อให้ User เห็นสาเหตุ
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(err.message)}`)
  }
}
