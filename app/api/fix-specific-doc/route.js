import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Target document: DTT-CHK-2605-005
  const docId = '933871c0-fbca-4125-b510-ccec6776e7b7'

  // Check if it already has an approval record
  const { data: existing } = await supabase
    .from('document_approvals')
    .select('id')
    .eq('doc_id', docId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Already has approval records', existing })
  }

  // Insert a pending approval record for the administrator
  const { error } = await supabase
    .from('document_approvals')
    .insert([{
      doc_id: docId,
      doc_type: 'checklist',
      step_order: 1,
      status: 'pending',
      role_required: 'administrator' // Force it to show for admin
    }])

  if (error) {
    return NextResponse.json({ error })
  }

  return NextResponse.json({ message: 'Successfully inserted pending approval for DTT-CHK-2605-005' })
}
