import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data: inc } = await supabase.from('incidents').select('reported_by_id, status').eq('id', '224332a5-f213-4a33-98c8-dabf06c8a51f').single()
  
  const { data: user } = await supabase.from('user_profiles').select('id, email, full_name').eq('email', 'admin@dowa-tht.co.th').single()
  
  return NextResponse.json({
    incident_reporter: inc?.reported_by_id,
    admin_user: user?.id,
    are_equal: inc?.reported_by_id === user?.id
  })
}
