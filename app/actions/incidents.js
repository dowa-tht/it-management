'use server'

import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'
import { getNextNo, updateLastNo } from '@/lib/noSeries'
import { generateWorkflowSteps, recordLog } from './workflow'

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * 🚀 Server Action: สร้าง Incident ใหม่
 * รวม Logic การรันเลขที่เอกสาร, บันทึกข้อมูล, เริ่ม Workflow และบันทึก Logs ไว้ในที่เดียว
 */
export async function createIncident(formData) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const userEmail = session.user.email || 'system@internal'
    const userId = session.user.id

    // 1. ดึงเลขที่เอกสารล่าสุด
    const nextNoData = await getNextNo('INC')
    const caseNo = nextNoData ? nextNoData.nextNo : `INC-${Date.now()}`

    // 2. เตรียมข้อมูลสำหรับบันทึก (แยก ref_doc_id ออกเพราะเป็น UI field)
    const { ref_doc_id, ...cleanData } = formData
    
    const insertData = {
      ...cleanData,
      case_number: caseNo,
      status: formData.assigned_to ? 'In Progress' : 'Open',
      acknowledged_at: formData.assigned_to ? new Date().toISOString() : null,
      assigned_at: formData.assigned_to ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    }

    // 3. บันทึกลงตาราง incidents
    const { data: inserted, error: incError } = await supabaseAdmin
      .from('incidents')
      .insert([insertData])
      .select()
      .single()

    if (incError) throw incError
    const newInc = inserted
    const docId = newInc.id

    // 4. อัปเดตเลขที่เอกสารล่าสุดใน No Series
    try {
      await updateLastNo('INC', caseNo)
    } catch (err) {
      console.warn('Failed to update No Series:', err)
    }

    // 5. เริ่มระบบ Unified Workflow (generateWorkflowSteps)
    // ใช้ Severity เป็นเกณฑ์ในการตัดสินใจ Workflow ตามมาตรฐาน
    await generateWorkflowSteps(docId, 'incident', 'severity', formData.severity)

    // 6. บันทึก Incident Log (สร้างเคสใหม่)
    await recordLog(
      docId, 
      'incident', 
      'สร้างเคสใหม่', 
      `แจ้งโดย: ${formData.reported_by}${formData.ref_doc_no ? ` (อ้างอิง ${formData.ref_doc_no})` : ''}`, 
      userEmail
    )

    // 7. หากมีการมอบหมายงานทันที ให้บันทึก Log เพิ่ม
    if (formData.assigned_to) {
      await recordLog(
        docId,
        'incident',
        'กำหนดผู้รับผิดชอบ',
        `มอบหมายให้: ${formData.assigned_to} · Response Time เริ่มนับแล้ว`,
        userEmail
      )
    }

    // 8. หากอ้างอิงมาจาก Checklist ให้บันทึก Log กลับไปยังต้นทางด้วย
    if (formData.ref_type === 'checklist' && ref_doc_id) {
      await recordLog(
        ref_doc_id,
        'checklist',
        'เปิด Incident Case',
        `เคสเลขที่: ${caseNo} | หัวข้อ: ${formData.title.replace('[Checklist Ref] ', '')}`,
        userEmail
      )
    }

    return { success: true, docId: docId, caseNo: caseNo }
  } catch (err) {
    console.error('createIncident Error:', err)
    return { success: false, error: err.message }
  }
}
