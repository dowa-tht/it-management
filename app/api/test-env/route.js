import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    hasUrl: !!url,
    hasKey: !!key,
    urlLength: url ? url.length : 0,
    keyLength: key ? key.length : 0,
    allSupabaseKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  })
}
