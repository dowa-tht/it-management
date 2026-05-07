import { getUnifiedPendingApprovals } from '@/app/actions/workflow'
import { getCurrentUserSession } from '@/app/actions/user'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getCurrentUserSession()
  const res = await getUnifiedPendingApprovals()
  
  // Also check profile manually
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, role')
    .eq(session?.type === 'internal' ? 'email' : 'id', session?.user?.email || session?.user?.id)
    .maybeSingle()

  return NextResponse.json({
    session_type: session?.type,
    user_email: session?.user?.email,
    profile_found: profile,
    unified_results: res
  })
}
