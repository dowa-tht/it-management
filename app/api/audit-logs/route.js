import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data: logs, error } = await supabase
    .from('system_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  
  return NextResponse.json({ logs, error })
}
