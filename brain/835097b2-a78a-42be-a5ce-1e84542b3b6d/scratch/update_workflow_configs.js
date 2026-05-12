const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fhcsvvlwhwqzlsltrkuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'
);

const newConfigs = [
  // Low Severity (0)
  { target_type: 'incident', condition_key: 'severity', condition_value: '0', step_order: 1, role_required: 'it_staff', is_active: true },
  { target_type: 'incident', condition_key: 'severity', condition_value: '0', step_order: 2, role_required: 'reporter', is_active: true },
  
  // Medium Severity (1)
  { target_type: 'incident', condition_key: 'severity', condition_value: '1', step_order: 1, role_required: 'it_staff', is_active: true },
  { target_type: 'incident', condition_key: 'severity', condition_value: '1', step_order: 2, role_required: 'reporter', is_active: true },
  
  // High Severity (2)
  { target_type: 'incident', condition_key: 'severity', condition_value: '2', step_order: 1, role_required: 'it_staff', is_active: true },
  { target_type: 'incident', condition_key: 'severity', condition_value: '2', step_order: 2, role_required: 'auditor', is_active: true },
  { target_type: 'incident', condition_key: 'severity', condition_value: '2', step_order: 3, role_required: 'admin', is_active: true }
];

async function update() {
  console.log('--- STARTING DATABASE UPDATE ---');
  
  // 1. Delete existing incident configs to avoid mixed states
  const { error: delError } = await supabase
    .from('workflow_configs')
    .delete()
    .eq('target_type', 'incident');
  
  if (delError) {
    console.error('Error deleting old configs:', delError);
    return;
  }
  console.log('Old incident configs cleared.');

  // 2. Insert new standard configs
  const { error: insError } = await supabase
    .from('workflow_configs')
    .insert(newConfigs);
  
  if (insError) {
    console.error('Error inserting new configs:', insError);
    return;
  }
  console.log('New standard workflow configurations applied successfully.');
}

update();
