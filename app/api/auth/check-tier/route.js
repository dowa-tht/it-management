import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { email } = await req.json()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Missing Env' }, { status: 500 })
    }

    const cleanUrl = String(supabaseUrl).endsWith('/') ? String(supabaseUrl).slice(0, -1) : String(supabaseUrl)
    const safeEmail = String(email || '').trim()

    if (!safeEmail) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุอีเมล' }, { status: 400 })
    }

    const response = await fetch(`${cleanUrl}/rest/v1/user_registry?email=eq.${encodeURIComponent(safeEmail)}&is_active=eq.true&select=user_role`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Supabase API Error' }, { status: response.status })
    }

    const data = await response.json()
    
    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, tier: 'not_found' })
    }

    const role = data[0].user_role
    let tier = 'not_found'
    
    if (['administrator', 'supervisor'].includes(role)) {
      tier = 'internal'
    } else if (['approval', 'guest'].includes(role)) {
      tier = 'external'
    }

    return NextResponse.json({ success: true, tier, role })
  } catch (err) {
    console.error('API Check Tier Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
