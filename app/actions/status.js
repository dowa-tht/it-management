'use server'

export async function checkUserTier(email) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: 'Configuration Missing (Env)' }
    }

    const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

    // Use Native Fetch to call Supabase REST API (No Library dependency)
    const response = await fetch(`${cleanUrl}/rest/v1/user_registry?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=user_role`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Supabase API Error: ${response.status} - ${errText}`)
    }

    const data = await response.json()
    
    if (!data || data.length === 0) {
      return { success: true, tier: 'not_found' }
    }

    const registry = data[0]
    const role = registry.user_role

    if (['administrator', 'supervisor'].includes(role)) {
      return { success: true, tier: 'internal', role }
    } else if (['approval', 'guest'].includes(role)) {
      return { success: true, tier: 'external', role }
    }

    return { success: true, tier: 'not_found' }
  } catch (err) {
    console.error('CRITICAL STATUS ERROR:', err.message)
    // Return a specific error string to catch it in page.js
    return { success: false, error: `Critical Error: ${err.message}` }
  }
}
