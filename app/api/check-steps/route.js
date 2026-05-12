import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data: steps } = await supabase.from('document_approvals').select('id, step_order, role_required, approver_id, status').eq('doc_id', '224332a5-f213-4a33-98c8-dabf06c8a51f').order('step_order')
  
  return NextResponse.json(steps)
}
