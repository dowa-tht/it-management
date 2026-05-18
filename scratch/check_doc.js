const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying document...');
  const { data: doc, error: docErr } = await supabase
    .from('checklist_docs')
    .select('*')
    .eq('doc_no', 'DTT-CHK-2605-010')
    .single();

  if (docErr) {
    console.error('Error fetching document:', docErr);
    return;
  }

  // Also query workflow steps if any
  console.log('\nQuerying workflow steps without order...');
  const { data: steps, error: stepsErr } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('doc_id', doc.id);

  if (stepsErr) {
    console.error('Error fetching steps:', stepsErr);
    return;
  }

  console.log(`Found ${steps.length} workflow steps:`);
  console.log(JSON.stringify(steps, null, 2));
}

main().catch(console.error);
