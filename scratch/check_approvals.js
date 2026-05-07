
const { createClient } = require('@supabase/supabase-js');

async function checkApprovals() {
  const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: approvals, error } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching approvals:', error);
    return;
  }

  console.log('Pending Approvals count:', approvals.length);
  console.log('Sample Approvals:', JSON.stringify(approvals.slice(0, 3), null, 2));

  // Also check user profiles
  const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, role, email').limit(10);
  console.log('Sample Profiles:', JSON.stringify(profiles, null, 2));

  // Count per role
  const roles = approvals.reduce((acc, a) => {
    acc[a.role_required] = (acc[a.role_required] || 0) + 1;
    return acc;
  }, {});
  console.log('Pending counts per role_required:', roles);
}

checkApprovals();
