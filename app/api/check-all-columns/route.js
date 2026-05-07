import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: configs } = await supabase.from('workflow_configs').select('*').limit(1)
  const { data: approvals } = await supabase.from('document_approvals').select('*').limit(1)

  return NextResponse.json({
    workflow_configs_columns: configs ? Object.keys(configs[0]) : 'table not found or empty',
    document_approvals_columns: approvals ? Object.keys(approvals[0]) : 'table not found or empty'
  })
}
