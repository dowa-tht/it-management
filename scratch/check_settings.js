
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'working_hours')
        .single();
    
    if (error) {
        console.error('Error fetching settings:', error);
    } else {
        console.log('Working Hours Settings:', JSON.stringify(data.value, null, 2));
    }
}

checkSettings();
