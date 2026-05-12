import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const admins = users.filter(u => u.email === 'admin@dowa-tht.co.th' || u.email === 'administrator@dowa-tht.co.th');
  
  return NextResponse.json({ admins })
}
