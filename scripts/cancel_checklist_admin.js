/**
 * Script: ยกเลิกเอกสาร Checklist โดย Admin
 * รัน: node scripts/cancel_checklist_admin.js
 *
 * ใช้ Service Role Key เพื่อ bypass RLS
 * ไม่แตะ DB ตรงๆ — ใช้ Supabase client เหมือนที่ระบบทำอยู่
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const DOC_NO = 'DTT-CHK-2605-006'
const CANCEL_REASON = 'ยกเลิกโดย Admin Script'
const ADMIN_EMAIL = 'admin@dowa-tht.co.th'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cancelChecklist() {
  console.log(`\n🔍 ค้นหาเอกสาร: ${DOC_NO}`)

  // 1. หา document
  const { data: doc, error: docErr } = await supabase
    .from('checklist_docs')
    .select('id, doc_no, status, workflow_status, created_by_id')
    .eq('doc_no', DOC_NO)
    .single()

  if (docErr || !doc) {
    console.error('❌ ไม่พบเอกสาร:', docErr?.message)
    process.exit(1)
  }

  console.log(`📄 พบเอกสาร: ${doc.doc_no} | Status: ${doc.status} | Workflow: ${doc.workflow_status}`)

  // 2. ตรวจสอบสถานะ
  if (doc.status === 'Cancelled') {
    console.log('⚠️ เอกสารนี้ถูกยกเลิกไปแล้ว — เพิ่ม audit log เพื่อความสมบูรณ์')
    await supabase.from('system_audit_logs').insert({
      doc_id: doc.id,
      doc_type: 'checklist',
      action: 'Cancelled',
      details: `ยกเลิกโดย Admin Script — เหตุผล: ${CANCEL_REASON}`,
      user_email: ADMIN_EMAIL,
      created_at: new Date().toISOString()
    })
    console.log('✅ บันทึก audit log เรียบร้อย')
    process.exit(0)
  }
  if (doc.status === 'Closed') {
    console.log('❌ ไม่สามารถยกเลิกเอกสารที่ปิดสำเร็จแล้ว')
    process.exit(1)
  }

  // 3. ยกเลิก workflow steps ที่ค้างอยู่
  const { data: stepsUpdated, error: stepsErr } = await supabase
    .from('document_approvals')
    .update({
      status: 'cancelled',
      action_at: new Date().toISOString(),
      comment: 'Cancelled by Admin Script'
    })
    .eq('doc_id', doc.id)
    .in('status', ['pending', 'waiting'])
    .select()

  if (stepsErr) {
    console.error('❌ ยกเลิก workflow steps ไม่สำเร็จ:', stepsErr.message)
    process.exit(1)
  }
  console.log(`✅ ยกเลิก workflow steps: ${stepsUpdated?.length ?? 0} รายการ`)

  // 4. อัปเดตสถานะเอกสารหลัก
  const { error: updateErr } = await supabase
    .from('checklist_docs')
    .update({
      status: 'Cancelled',
      workflow_status: null,
      assigned_approver_id: null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: ADMIN_EMAIL,
      cancel_reason: CANCEL_REASON
    })
    .eq('id', doc.id)

  if (updateErr) {
    console.error('❌ อัปเดตสถานะเอกสารไม่สำเร็จ:', updateErr.message)
    process.exit(1)
  }
  console.log('✅ อัปเดตสถานะเอกสารเป็น Cancelled เรียบร้อย')

  // 5. บันทึก audit log
  const { error: logErr } = await supabase
    .from('system_audit_logs')
    .insert({
      doc_id: doc.id,
      doc_type: 'checklist',
      action: 'Cancelled',
      details: `ยกเลิกโดย Admin Script — เหตุผล: ${CANCEL_REASON}`,
      user_email: ADMIN_EMAIL,
      created_at: new Date().toISOString()
    })

  if (logErr) {
    console.warn('⚠️ บันทึก audit log ไม่สำเร็จ (ไม่ critical):', logErr.message)
  } else {
    console.log('✅ บันทึก audit log เรียบร้อย')
  }

  console.log(`\n🎉 เสร็จสิ้น: เอกสาร ${DOC_NO} ถูกยกเลิกเรียบร้อยแล้ว`)
}

cancelChecklist()
