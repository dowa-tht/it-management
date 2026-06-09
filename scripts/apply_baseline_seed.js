import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
dotenv.config({ path: envFile })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Define folders and file order
const ARTIFACT_DIR = 'brain/production-rebaseline/dev-export/20260609-092859'

// We will map target ids after user creation
const userIdMapping = {}

async function runSeed() {
  console.log('=== Starting Baseline Seed Import ===')

  // 1. system_settings
  await seedTable('system_settings', path.join(ARTIFACT_DIR, '02-baseline-tables/system_settings.json'), async (data) => {
    // value is stored as JSON object or string, database key is unique primary key
    for (const row of data) {
      const { data: res, error } = await supabase
        .from('system_settings')
        .upsert({ key: row.key, value: row.value })
      if (error) throw error
    }
  })

  // 2. master_data (Merge base and supplement)
  const masterDataPath = path.join(ARTIFACT_DIR, '02-baseline-tables/master_data.json')
  const masterDataSupplementPath = path.join(ARTIFACT_DIR, '02-baseline-tables/master_data_supplement.json')
  const baseMaster = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'))
  const supplementMaster = JSON.parse(fs.readFileSync(masterDataSupplementPath, 'utf8')).map(item => {
    // delete source meta field before insert
    const { _source, ...clean } = item
    return clean
  })
  const mergedMaster = [...baseMaster, ...supplementMaster]

  console.log(`Seeding master_data: combined base and supplement (${mergedMaster.length} total rows)`)
  for (const row of mergedMaster) {
    const { error } = await supabase
      .from('master_data')
      .upsert({
        type: row.type,
        value: row.value,
        sort_order: row.sort_order,
        is_active: row.is_active
      }, { onConflict: 'type,value' })
    if (error) {
      console.error('Failed to seed master_data row:', row, error)
      throw error
    }
  }

  // 3. holidays
  await seedTable('holidays', path.join(ARTIFACT_DIR, '02-baseline-tables/holidays.json'), async (data) => {
    for (const row of data) {
      const { error } = await supabase
        .from('holidays')
        .upsert({ holiday_date: row.holiday_date, description: row.description }, { onConflict: 'holiday_date' })
      if (error) throw error
    }
  })

  // 4. permission_sets
  await seedTable('permission_sets', path.join(ARTIFACT_DIR, '02-baseline-tables/permission_sets.json'), async (data) => {
    for (const row of data) {
      const { error } = await supabase
        .from('permission_sets')
        .upsert(row, { onConflict: 'role_name,feature_key' })
      if (error) throw error
    }
  })

  // 5. checklist_procedure_plans
  // The exported template lists plans. Let's check checklist_templates plan links:
  // plans are:
  // - "da946554-ca26-4383-acfd-440608b8fe99" (is_default)
  // - "50cce852-1f88-43e7-8fe3-86694adac354"
  // - "c844aa0c-ad30-4ea6-a35c-012ae3223847"
  // Let's seed them from checklist_template_procedure_plans_by_business_keys.json or hardcoded since we know the 3 templates
  const plans = [
    {
      id: "da946554-ca26-4383-acfd-440608b8fe99",
      plan_name: "สมมติฐานการฝึกซ้อมแผนฉุกเฉินด้านระบบคอมพิวเตอร์ - ข้อมูลในระบบไฟล์ Server สูญหาย / เสียหาย",
      description: "แผนกู้คืนระบบเมื่อข้อมูลไฟล์เซิร์ฟเวอร์เสียหาย",
      steps: [
        { step_no: 1, step_name: "ตรวจสอบและประเมินระดับความเสียหายของข้อมูล", duration_minutes: 30 },
        { step_no: 2, step_name: "แจ้งเตือนทีมงานที่เกี่ยวข้องและผู้บริหารระบบ", duration_minutes: 15 },
        { step_no: 3, step_name: "กู้คืนข้อมูลจาก Shadow Copy / Local Backup ล่าสุด", duration_minutes: 120 },
        { step_no: 4, step_name: "กรณีกู้คืนไม่ได้ ให้สลับไปใช้ Cloud Backup (OneDrive/NAS)", duration_minutes: 240 },
        { step_no: 5, step_name: "ทดสอบการเปิดไฟล์ตรวจสอบความสมบูรณ์ร่วมกับผู้ใช้", duration_minutes: 60 },
        { step_no: 6, step_name: "สรุปรายงานผลการกู้คืนและแนวทางการป้องกันในอนาคต", duration_minutes: 30 }
      ]
    },
    {
      id: "50cce852-1f88-43e7-8fe3-86694adac354",
      plan_name: "สมมติฐานการฝึกซ้อมแผนฉุกเฉินด้านระบบคอมพิวเตอร์ - ระบบเครือข่าย / Internet ขัดข้อง",
      description: "แผนกู้คืนระบบเมื่อ Internet หรือระบบเครือข่ายล่ม",
      steps: [
        { step_no: 1, step_name: "ตรวจสอบสถานะ Link หลักและอุปกรณ์ Gateway", duration_minutes: 15 },
        { step_no: 2, step_name: "สลับการทำงานไปใช้ Link สำรอง (Backup ISP Link) ทันที", duration_minutes: 10 },
        { step_no: 3, step_name: "แจ้งผู้ให้บริการอินเทอร์เน็ตหลัก (ISP) เพื่อตรวจสอบสาเหตุ", duration_minutes: 20 },
        { step_no: 4, step_name: "ตรวจสอบ Routing และการเข้าถึงระบบภายในโรงงาน", duration_minutes: 30 },
        { step_no: 5, step_name: "เมื่ออินเทอร์เน็ตหลักกลับมาทำงาน ให้ทดสอบ Failback กลับมา Link หลัก", duration_minutes: 15 }
      ]
    },
    {
      id: "c844aa0c-ad30-4ea6-a35c-012ae3223847",
      plan_name: "สมมติฐานการฝึกซ้อมแผนฉุกเฉินด้านระบบคอมพิวเตอร์ - ระบบถูกโจมตีทางไซเบอร์ (ยึดครองบัญชีผู้ใช้ Microsoft 365)",
      description: "แผนกู้คืนระบบเมื่อบัญชี M365 ถูกควบคุมโดยผู้ไม่หวังดี",
      steps: [
        { step_no: 1, step_name: "ล็อกและระงับการใช้งานบัญชีที่ถูกแฮกทันที (Block Sign-in)", duration_minutes: 10 },
        { step_no: 2, step_name: "ตรวจสอบและล้าง Active Sessions ทั้งหมดของผู้ใช้ผ่าน Azure AD", duration_minutes: 15 },
        { step_no: 3, step_name: "บังคับเปลี่ยนรหัสผ่านใหม่ (Reset Password) ตามมาตรฐานความปลอดภัย", duration_minutes: 10 },
        { step_no: 4, step_name: "ตรวจสอบและลบ MFA Devices ที่ไม่รู้จักออกจากระบบ", duration_minutes: 15 },
        { step_no: 5, step_name: "ตรวจสอบ Inbox Rules และการโอนย้ายอีเมลผิดปกติ", duration_minutes: 30 },
        { step_no: 6, step_name: "ปลดบล็อกและให้ผู้ใช้ล็อกอินทดสอบการตั้งค่าใหม่", duration_minutes: 20 }
      ]
    }
  ]

  console.log(`Seeding checklist_procedure_plans: ${plans.length} rows`)
  for (const plan of plans) {
    const { error } = await supabase
      .from('checklist_procedure_plans')
      .upsert(plan)
    if (error) throw error
  }

  // 6. checklist_templates
  await seedTable('checklist_templates', path.join(ARTIFACT_DIR, '02-baseline-tables/checklist_templates.json'), async (data) => {
    // Generate UUIDs or keep original ids if they exist. In the JSON they do not have ids, but item_key / item_label can be resolved.
    // Let's check how the templates table is defined. ID is UUID primary key. Let's inspect live dev templates ids first, or generate fixed UUIDs for consistency.
    // The raw JSON has item_label, category, item_key, freq_type, instruction, ui_template_type, template_config, scope_mode, target_type, config_version, is_active, sort_order.
    // We can map these using template_config.plan_id / specific business keys.
    // Let's define stable UUIDs based on item_label / category / item_key to make the mapping consistent.
    const templatesWithIds = data.map(row => {
      let id = 'aaaaaaaa-1111-1111-1111-111111111111' // CCTV daily check
      if (row.item_label === 'ซ้อมแผนฉุกเฉินทางด้าน IT ประจำปี') {
        id = '55555555-5555-5555-5555-555555555555'
      } else if (row.item_label === 'Monthly Server AC Maintenance') {
        id = 'bbbbbbbb-2222-2222-2222-222222222222'
      } else if (row.item_label === 'ตรวจสอบกล้อง CCTV Online / Recording') {
        id = 'cccccccc-3333-3333-3333-333333333333'
      } else if (row.item_label === 'CCTV Terminal Box') {
        id = 'dddddddd-4444-4444-4444-444444444444'
      } else if (row.item_label === 'Test CCTV Monthly') {
        id = 'eeeeeeee-5555-5555-5555-555555555555'
      } else if (row.item_label === 'ทดสอบระบบไฟสำรอง (UPS)') {
        id = 'ffffffff-6666-6666-6666-666666666666'
      } else if (row.item_label === 'ตรวจสอบ M365 Service Health') {
        id = '00000000-7777-7777-7777-777777777777'
      } else if (row.item_label === 'จัดการ User / License (พนักงานเข้า-ออก)') {
        id = '11111111-8888-8888-8888-888888888888'
      } else if (row.item_label === 'ตรวจสอบ M365 Sign-in Log') {
        id = '22222222-9999-9999-9999-999999999999'
      } else if (row.item_label === 'ตรวจสอบ Cisco Meraki Dashboard') {
        id = '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      } else if (row.item_label === 'ตรวจสอบ HPE Aruba Instant On Site Health') {
        id = '44444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      } else if (row.item_label === 'Firmware Review (Meraki / Aruba / Yeastar)') {
        id = '55555555-cccc-cccc-cccc-cccccccccccc'
      } else if (row.item_label === 'ตรวจสอบ Synology NAS Health / Storage') {
        id = '66666666-dddd-dddd-dddd-dddddddddddd'
      } else if (row.item_label === 'ทดสอบและตรวจสอบความสมบูรณ์ของระบบ Backup') {
        id = '77777777-eeee-eeee-eeee-eeeeeeeeeeee'
      } else if (row.item_label === 'ตรวจสอบและอัปเดต Server Patch') {
        id = '88888888-ffff-ffff-ffff-ffffffffffff'
      } else {
        // Fallback random uuid derived stably
        id = cryptoStablyUUID(row.item_label || row.item_key)
      }
      return { id, ...row }
    })

    for (const row of templatesWithIds) {
      const { error } = await supabase
        .from('checklist_templates')
        .upsert(row)
      if (error) throw error
    }
  })

  // Helper function to stably hash string to UUID structure
  function cryptoStablyUUID(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hex = Math.abs(hash).toString(16).padEnd(12, 'f')
    return `99999999-9999-9999-9999-${hex.substring(0, 12)}`
  }

  // 7. checklist_targets
  // Raw targets has target_code, target_type, name, location, qr_value, metadata, is_active.
  // The target_id in mapping tables will be referenced by UUID. Let's make sure targets have stable IDs.
  const targetsData = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, '02-baseline-tables/checklist_targets.json'), 'utf8'))
  const targetsWithIds = targetsData.map(row => {
    let id = ''
    if (row.target_code === 'CCTV-TERM-01') id = '11111111-1111-1111-1111-111111111101'
    else if (row.target_code === 'CCTV-TERM-02') id = '11111111-1111-1111-1111-111111111102'
    else if (row.target_code === 'CCTV-TERM-03') id = '11111111-1111-1111-1111-111111111103'
    else if (row.target_code === 'CCTV-TERM-04') id = '11111111-1111-1111-1111-111111111104'
    else if (row.target_code === 'CCTV-TERM-05') id = '11111111-1111-1111-1111-111111111105'
    else if (row.target_code === 'AC-SRV-001') id = '22222222-2222-2222-2222-222222222201'
    else id = cryptoStablyUUID(row.target_code)
    return { id, ...row }
  })

  for (const row of targetsWithIds) {
    const { error } = await supabase
      .from('checklist_targets')
      .upsert(row, { onConflict: 'qr_value' })
    if (error) throw error
  }

  // 8. checklist_template_targets
  // In dev-export, we have checklist_template_targets_raw.json which has explicit template_id, target_id, target_type.
  // We can insert it directly.
  await seedTable('checklist_template_targets', path.join(ARTIFACT_DIR, '02-baseline-tables/checklist_template_targets_raw.json'), async (data) => {
    for (const row of data) {
      // Keep only DB fields
      const { item_key, item_label, category, freq_type, target_code, joined_target_type, ...clean } = row
      const { error } = await supabase
        .from('checklist_template_targets')
        .upsert(clean)
      if (error) throw error
    }
  })

  // 9. checklist_template_procedure_plans
  // We can construct this from checklist_template_procedure_plans_by_business_keys.json or since we know the template has ID:
  // "55555555-5555-5555-5555-555555555555" (ซ้อมแผนฉุกเฉินทางด้าน IT ประจำปี)
  // maps to:
  // - plan: "da946554-ca26-4383-acfd-440608b8fe99" (is_default = true, sort_order = 1)
  // - plan: "50cce852-1f88-43e7-8fe3-86694adac354" (is_default = false, sort_order = 0)
  // - plan: "c844aa0c-ad30-4ea6-a35c-012ae3223847" (is_default = false, sort_order = 2)
  const templatePlanMappings = [
    {
      template_id: "55555555-5555-5555-5555-555555555555",
      plan_id: "50cce852-1f88-43e7-8fe3-86694adac354",
      is_default: false,
      sort_order: 0,
      is_active: true
    },
    {
      template_id: "55555555-5555-5555-5555-555555555555",
      plan_id: "da946554-ca26-4383-acfd-440608b8fe99",
      is_default: true,
      sort_order: 1,
      is_active: true
    },
    {
      template_id: "55555555-5555-5555-5555-555555555555",
      plan_id: "c844aa0c-ad30-4ea6-a35c-012ae3223847",
      is_default: false,
      sort_order: 2,
      is_active: true
    }
  ]
  for (const mapping of templatePlanMappings) {
    const { error } = await supabase
      .from('checklist_template_procedure_plans')
      .upsert(mapping, { onConflict: 'template_id,plan_id' })
    if (error) throw error
  }

  // 10. auth.users (Read target profile auth users or create placeholder mappings)
  // Wait: The runbook states "CREATE auth.users FOR admin@dowa-tht.co.th...".
  // Let's load auth_users.json and see what users exist on target. If they don't exist, how to create them?
  // We can query auth.users on target or we can create them using supabase.auth.admin.createUser.
  console.log('=== Checking & Bootstrapping Selected Users ===')
  const authUsers = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, '04-selected-users/auth_users.json'), 'utf8'))
  for (const user of authUsers) {
    console.log(`Checking auth user: ${user.email}`)
    // Look up user by email on target first
    const { data: search, error: searchErr } = await supabase.auth.admin.listUsers()
    if (searchErr) throw searchErr
    
    let targetUser = search.users.find(u => u.email === user.email)
    if (!targetUser) {
      console.log(`Creating user in auth: ${user.email}`)
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'ChangeMe1234!', // Temporary secure password, will trigger onboarding / reset
        email_confirm: true,
        user_metadata: user.raw_user_meta_data,
        app_metadata: user.raw_app_meta_data
      })
      if (createErr) throw createErr
      targetUser = newUser.user
    } else {
      console.log(`User already exists: ${user.email} with ID ${targetUser.id}`)
    }
    userIdMapping[user.id] = targetUser.id
  }

  console.log('User ID Mapping Worksheet:', JSON.stringify(userIdMapping, null, 2))

  // 11. user_profiles
  // Load user_profiles.json, remap ID using userIdMapping, clear onboarding/pin/etc as per contract
  await seedTable('user_profiles', path.join(ARTIFACT_DIR, '04-selected-users/user_profiles.json'), async (data) => {
    for (const profile of data) {
      const targetId = userIdMapping[profile.id]
      if (!targetId) {
        throw new Error(`Orphan user profile in seed, no auth user id mapping found for ${profile.email}`)
      }
      const upsertData = {
        id: targetId,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        is_active: profile.is_active,
        can_be_assignee: profile.can_be_assignee,
        expires_at: profile.expires_at,
        // Reset sensitive state fields
        signature_pin: null,
        is_onboarded: false,
        onboarding_token: null,
        force_password_change: true,
        pin_reset_token: null,
        pin_reset_expires: null,
        otp_code: null,
        otp_expires_at: null
      }
      const { error } = await supabase
        .from('user_profiles')
        .upsert(upsertData)
      if (error) throw error
    }
  })

  // 12. user_whitelist
  await seedTable('user_whitelist', path.join(ARTIFACT_DIR, '04-selected-users/user_whitelist.json'), async (data) => {
    for (const whitelist of data) {
      const { error } = await supabase
        .from('user_whitelist')
        .upsert({ email_hash: whitelist.email_hash, created_at: whitelist.created_at }, { onConflict: 'email_hash' })
      if (error) throw error
    }
  })

  // 13. workflow_configs
  // Load workflow_configs.json, remap approver_id if set, then insert
  await seedTable('workflow_configs', path.join(ARTIFACT_DIR, '03-workflow-and-series/workflow_configs.json'), async (data) => {
    for (const row of data) {
      let approver_id = row.approver_id
      if (approver_id && userIdMapping[approver_id]) {
        approver_id = userIdMapping[approver_id]
      } else if (approver_id) {
        throw new Error(`Orphan approver_id found in workflow_configs: ${approver_id}`)
      }
      const { error } = await supabase
        .from('workflow_configs')
        .upsert({
          doc_type: row.doc_type,
          target_type: row.target_type,
          condition_key: row.condition_key,
          condition_value: row.condition_value,
          step_order: row.step_order,
          role_required: row.role_required,
          approver_id,
          is_active: row.is_active
        })
      if (error) throw error
    }
  })

  // 14. approval_substitutes (empty in dev, but seed empty list as contract)
  await seedTable('approval_substitutes', path.join(ARTIFACT_DIR, '03-workflow-and-series/approval_substitutes.json'), async (data) => {
    for (const row of data) {
      const primary_approver_id = userIdMapping[row.primary_approver_id]
      const substitute_id = userIdMapping[row.substitute_id]
      if (!primary_approver_id || !substitute_id) {
        throw new Error(`Orphan approver/substitute relationship: primary=${row.primary_approver_id}, sub=${row.substitute_id}`)
      }
      const { error } = await supabase
        .from('approval_substitutes')
        .upsert({
          primary_approver_id,
          substitute_id,
          is_active: row.is_active,
          start_date: row.start_date,
          end_date: row.end_date,
          reason: row.reason
        })
      if (error) throw error
    }
  })

  // 15. no_series
  await seedTable('no_series', path.join(ARTIFACT_DIR, '03-workflow-and-series/no_series.json'), async (data) => {
    for (const row of data) {
      const { error } = await supabase
        .from('no_series')
        .upsert(row, { onConflict: 'code' })
      if (error) throw error
    }
  })

  // 16. no_series_lines
  await seedTable('no_series_lines', path.join(ARTIFACT_DIR, '03-workflow-and-series/no_series_lines.json'), async (data) => {
    for (const row of data) {
      const { error } = await supabase
        .from('no_series_lines')
        .upsert(row, { onConflict: 'series_code,starting_date' })
      if (error) throw error
    }
  })

  console.log('=== Baseline Seed Import Completed Successfully ===')
}

async function seedTable(tableName, filePath, insertFn) {
  if (!fs.existsSync(filePath)) {
    console.log(`Warning: File ${filePath} not found, skipping table ${tableName}`)
    return
  }
  const content = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(content)
  console.log(`Seeding table ${tableName}: ${data.length} rows`)
  await insertFn(data)
}

runSeed().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
