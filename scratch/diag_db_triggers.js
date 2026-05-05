const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually load .env.local
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '')
    }
  })
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnostic() {
  console.log('🔍 Starting Database Diagnostic...\n')

  // 1. Check for Triggers on auth.users
  console.log('--- 1. Triggers on auth.users ---')
  const { data: triggers, error: tError } = await supabase.rpc('get_raw_sql', {
    sql_query: `
      SELECT 
        trigger_name, 
        event_manipulation, 
        event_object_table, 
        action_statement, 
        action_timing
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth' AND event_object_table = 'users';
    `
  })

  if (tError) {
    console.error('⚠️ Could not fetch triggers via RPC (Check if get_raw_sql exists).')
    console.log('If you are in Supabase SQL Editor, run this:')
    console.log(`SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';`)
  } else {
    console.table(triggers)
  }

  // 2. Check Role Constraint on user_profiles
  console.log('\n--- 2. Check Constraints on user_profiles ---')
  const { data: constraints, error: cError } = await supabase.rpc('get_raw_sql', {
    sql_query: `
      SELECT 
        conname as constraint_name, 
        pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'public.user_profiles'::regclass;
    `
  })

  if (cError) {
    console.error('⚠️ Could not fetch constraints via RPC.')
  } else {
    console.table(constraints)
  }

  // 3. Check Default Value for role column
  console.log('\n--- 3. Default values for user_profiles.role ---')
  const { data: defaults, error: dError } = await supabase.rpc('get_raw_sql', {
    sql_query: `
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'role';
    `
  })

  if (dError) {
    console.error('⚠️ Could not fetch defaults via RPC.')
  } else {
    console.table(defaults)
  }
}

diagnostic()
