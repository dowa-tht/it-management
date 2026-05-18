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
  console.log('Querying document DTT-CHK-2605-011...');
  const { data: doc, error: docErr } = await supabase
    .from('checklist_docs')
    .select('*')
    .eq('doc_no', 'DTT-CHK-2605-011')
    .single();

  if (docErr) {
    console.error('Error fetching document:', docErr);
    return;
  }

  // Query checklist_items for this document
  console.log('\nQuerying checklist items for doc ID:', doc.id);
  const { data: items, error: itemsErr } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('doc_id', doc.id);

  if (itemsErr) {
    console.error('Error fetching items:', itemsErr);
    return;
  }

  console.log(`Found ${items.length} items:`);
  const output = {
    document: doc,
    items: items
  };
  fs.writeFileSync(path.join(__dirname, 'check_doc_output.json'), JSON.stringify(output, null, 2), 'utf8');
  console.log('✅ Wrote output to check_doc_output.json');
}

main().catch(console.error);


