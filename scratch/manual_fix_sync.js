
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

async function fix() {
  // 1. Find the incident resolution
  const { data: incident } = await supabase.from('incidents').select('id, case_number, resolution').eq('case_number', 'DTT-INC-2605-004').single();
  console.log("Incident:", incident);

  // 2. Find the checklist item linked to this incident
  const { data: item } = await supabase.from('checklist_items').select('id, doc_id, notes, status')
    .eq('status', 'NG')
    .ilike('notes', '%DTT-INC-2605-004%')
    .single();

  if (!item) {
    console.log("Could not find NG item for DTT-INC-2605-004");
    return;
  }
  console.log("Found item:", item);

  // 3. Update the item
  const resolutionMark = `[Corrected: ${incident.case_number}] ${incident.resolution || 'Resolved'}`;
  const newNotes = `${item.notes || ''}\n${resolutionMark}`.trim();

  const { error: updateErr } = await supabase.from('checklist_items').update({
    status: 'OK',
    notes: newNotes
  }).eq('id', item.id);

  if (updateErr) {
    console.error("Update error:", updateErr);
  } else {
    console.log("✅ Checklist item updated to OK");
    
    // 4. Log the action
    await supabase.from('checklist_logs').insert({
      doc_id: item.doc_id,
      action: 'System | Manual fix sync',
      user_email: 'admin@dowa-tht.co.th',
      details: `แก้ไขรายการ NG อัตโนมัติจากเคส ${incident.case_number} (Manual Fix)`
    });
    console.log("✅ Log recorded");
  }
}
fix();
