const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupPermissions() {
  console.log('🚀 Setting up Dynamic Permission System...');

  // 1. สร้างตารางผ่าน SQL RPC (ถ้ามี) หรือลองดึงข้อมูลเพื่อเช็ค
  const { error: tableError } = await supabase.from('permission_sets').select('id').limit(1);
  
  if (tableError && tableError.code === '42P01') {
    console.log('📦 Table permission_sets not found. Please run the SQL in scripts/migration_permissions.sql in Supabase SQL Editor.');
    console.log('⚠️ Since I cannot run raw SQL directly without a defined RPC, please copy the content of scripts/migration_permissions.sql to your Supabase Dashboard.');
    return;
  }

  // 2. ถ้ามีตารางแล้ว ให้อัปเดตสิทธิ์เริ่มต้น
  const defaultPerms = [
    { role_name: 'administrator', feature_key: 'dashboard', access_level: 'RW' },
    { role_name: 'administrator', feature_key: 'incidents', access_level: 'RW' },
    { role_name: 'administrator', feature_key: 'reports', access_level: 'RW' },
    { role_name: 'administrator', feature_key: 'backup', access_level: 'RW' },
    { role_name: 'administrator', feature_key: 'checklist', access_level: 'RW' },
    { role_name: 'administrator', feature_key: 'settings', access_level: 'RW' },
    { role_name: 'guest', feature_key: 'dashboard', access_level: 'RO' },
    { role_name: 'guest', feature_key: 'incidents', access_level: 'RO' },
    { role_name: 'guest', feature_key: 'reports', access_level: 'RO' },
    { role_name: 'guest', feature_key: 'backup', access_level: 'RO' },
    { role_name: 'guest', feature_key: 'checklist', access_level: 'RO' },
    { role_name: 'guest', feature_key: 'settings', access_level: 'RO' },
  ];

  console.log('📝 Seeding default permissions...');
  const { error: upsertError } = await supabase.from('permission_sets').upsert(defaultPerms, { onConflict: 'role_name,feature_key' });

  if (upsertError) {
    console.error('❌ Error seeding permissions:', upsertError.message);
  } else {
    console.log('✅ Permissions seeded successfully!');
  }
}

setupPermissions();
