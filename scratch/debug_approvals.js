
const { createClient } = require('@supabase/supabase-js');

async function debugApprovals() {
  const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. All pending approvals
  const { data: allPending } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('status', 'pending');
  
  console.log('Total Pending in DB:', allPending?.length);

  // 2. Natthawut's view
  const natthawutId = '81cd47d7-0dfb-4cda-b1ec-92725a4e3c69';
  const natthawutRole = 'administrator';

  const myPending = allPending?.filter(p => 
    p.approver_id === natthawutId || (p.approver_id === null && p.role_required === natthawutRole)
  );

  console.log('Pending for Natthawut (Role: administrator):', myPending?.length);
  
  // 3. Breakdown by role
  const breakdown = allPending?.reduce((acc, p) => {
    const key = `${p.role_required}${p.approver_id ? ' (Assigned)' : ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log('Breakdown:', breakdown);
}

debugApprovals();
