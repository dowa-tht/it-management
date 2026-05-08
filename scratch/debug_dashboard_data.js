const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugUser() {
    const email = 'admin_dtt@dowa-tht.co.th'
    
    console.log('--- Profiling User ---')
    const { data: profile, error: pError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
    
    if (pError) console.error('Profile Error:', pError)
    console.log('Profile:', JSON.stringify(profile, null, 2))

    if (profile) {
        console.log('\n--- Checking Incidents for this user ---')
        // Check by ID
        const { data: byId } = await supabase.from('incidents').select('id, title, reported_by').eq('reported_by_id', profile.id)
        console.log(`Incidents by ID (${profile.id}):`, byId?.length || 0)

        // Check by Email
        const { data: byEmail } = await supabase.from('incidents').select('id, title, reported_by').eq('reported_by', profile.email)
        console.log(`Incidents by Email (${profile.email}):`, byEmail?.length || 0)

        // Check by Full Name
        const { data: byName } = await supabase.from('incidents').select('id, title, reported_by').eq('reported_by', profile.full_name)
        console.log(`Incidents by Name (${profile.full_name}):`, byName?.length || 0)

        if (byName && byName.length > 0) {
            console.log('Sample from Name match:', byName[0])
        }
    }
}

debugUser()
