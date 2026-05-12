import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data: inc } = await supabase.from('incidents').select('*, reporter:user_profiles!reported_by_id(full_name, email)').eq('id', '224332a5-f213-4a33-98c8-dabf06c8a51f').single()
  
  return NextResponse.json({
    hasReportedById: 'reported_by_id' in inc,
    reportedByIdValue: inc.reported_by_id
  })
}
