import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_approvals';"
  })

  if (error) {
    // If rpc fails, try to just fetch one row to see columns
    const { data: row } = await supabase.from('document_approvals').select('*').limit(1)
    return NextResponse.json({ error, availableColumns: row ? Object.keys(row[0]) : 'no rows' })
  }

  return NextResponse.json(data)
}
