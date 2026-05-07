
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

async function fix() {
  const itemId = '64613fda-0faf-4760-ac79-74fdbd09abb7';
  const docId = '09e2f27a-66b6-46fd-9263-06d6c860f981';
  const incidentNo = 'DTT-INC-2605-004';
  const resolution = 'qwer'; // From previous check

  console.log(`Fixing Item ${itemId} for Doc ${docId}...`);

  const { data: item } = await supabase.from('checklist_items').select('notes').eq('id', itemId).single();
  const newNotes = `${item.notes || ''}\n[Corrected: ${incidentNo}] ${resolution}`.trim();

  const { error: updateErr } = await supabase.from('checklist_items').update({
    status: 'OK',
    notes: newNotes
  }).eq('id', itemId);

  if (updateErr) {
    console.error("Update failed:", updateErr);
  } else {
    console.log("✅ Checklist item updated successfully.");
    
    await supabase.from('checklist_logs').insert({
      doc_id: docId,
      action: 'System | Manual Sync Fix',
      user_email: 'admin_dtt@dowa-tht.co.th',
      details: `แก้ไขรายการ NG อัตโนมัติจากเคส ${incidentNo} (Manual Execution)`
    });
    console.log("✅ Log recorded.");
  }
}
fix();
