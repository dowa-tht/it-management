import { createClient } from '@supabase/supabase-js'
import { getEnv } from './envLoader'

let adminClient;

/**
 * 🛡️ Unified Supabase Admin Client
 * Uses envLoader to ensure credentials are found even in Server Actions/Turbopack context.
 */
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('ADMIN_SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !key) {
    throw new Error('Missing Supabase Admin credentials');
  }

  adminClient = createClient(url, key, {
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    }
  })
  
  return adminClient;
}
