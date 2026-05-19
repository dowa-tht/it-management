'use server'

import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'
import { getNextNo, updateLastNo } from '@/lib/noSeries'
import { generateWorkflowSteps, recordLog, recordSystemError } from './workflow'
import { WORKFLOW_DOC_REGISTRY } from '@/lib/workflowRegistry'

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

    // 1. ดึงเลขที่เอกสารล่าสุด (ใช้ Admin Client เพื่อข้าม RLS และเช็คเลขที่ซ้ำได้แม่นยำ)
    const nextNoData = await getNextNo('INC', new Date(), supabaseAdmin)
    const caseNo = nextNoData ? nextNoData.nextNo : `INC-${Date.now()}`

    // 2. เตรียมข้อมูลสำหรับบันทึก (แยก ref_doc_id ออกเพราะเป็น UI field)
    const { ref_doc_id, ...cleanData } = formData
    
    const { data: actorProfile, error: actorError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', session.user.id)
      .single()
      
    const creatorName = actorProfile ? (actorProfile.full_name || actorProfile.email) : userEmail

    const insertData = {
      ...cleanData,
      case_number: caseNo,
      status: formData.assigned_to ? 'In Progress' : 'Open',
      acknowledged_at: formData.assigned_to ? new Date().toISOString() : null,
      assigned_at: formData.assigned_to ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      created_by_id: userId,
      created_by: creatorName
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
      await updateLastNo('INC', caseNo, null, supabaseAdmin)
    } catch (err) {
      console.warn('Failed to update No Series:', err)
    }

    // 5. [Phase 2] ข้ามการสร้าง Workflow ในขั้นตอนนี้ 
    // ย้ายไปสร้างในขั้นตอน Resolve (submitRequest) ตามมาตรฐาน Unified Workflow v2

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
    await recordSystemError('Incident', `Create Incident failed: ${err.message}`, { error: err, formData: !!formData })
    return { success: false, error: err.message }
  }
}

/**
 * ✅ [Phase 2] Server Action: รับเรื่อง (Acknowledge)
 */
export async function acknowledgeIncident(id, severity, assigneeId = null) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const allowedSeverities = ['Low', 'Medium', 'High']
    if (!allowedSeverities.includes(severity)) {
      return { success: false, error: 'ระดับความรุนแรงไม่ถูกต้อง' }
    }

    const supabaseAdmin = getAdminClient()
    const userEmail = session.user.email || 'system@internal'

    const { data: actorProfile, error: actorError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', session.user.id)
      .single()

    if (actorError || !actorProfile) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งานหรือผู้ใช้ถูกระงับ' }
    if (actorProfile.is_active !== true) return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งานหรือผู้ใช้ถูกระงับ' }

    const { data: incident } = await supabaseAdmin
      .from('incidents')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!incident) return { success: false, error: 'ไม่พบเอกสาร Incident' }
    if (incident.status !== 'Open') return { success: false, error: 'เอกสารนี้ไม่อยู่ในสถานะ Open จึงรับเรื่องไม่ได้' }

    let finalAssignee = null
    let actionName = 'รับเรื่อง (Acknowledge)'
    let logDetails = ''

    if (actorProfile.role === 'it_staff') {
      finalAssignee = actorProfile
      actionName = 'รับเรื่อง (Acknowledge)'
      logDetails = `IT Staff: ${actorProfile.full_name || actorProfile.email || userEmail} รับเรื่องและเป็นผู้รับผิดชอบงาน | ระดับ: ${severity}`
    } else if (actorProfile.role === 'admin') {
      if (!assigneeId) return { success: false, error: 'กรุณาเลือก IT Staff ผู้รับผิดชอบงาน' }

      const { data: selectedAssignee } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', assigneeId)
        .single()

      if (!selectedAssignee) return { success: false, error: 'ไม่พบผู้รับผิดชอบงานที่เลือก' }
      if (selectedAssignee.is_active !== true) return { success: false, error: 'IT Staff ที่เลือกถูกระงับการใช้งาน' }
      if (selectedAssignee.role !== 'it_staff') return { success: false, error: 'ผู้รับผิดชอบงานต้องเป็น role IT Staff เท่านั้น' }

      finalAssignee = selectedAssignee
      actionName = 'มอบหมายงาน (Dispatch)'
      logDetails = `Administrator: ${actorProfile.full_name || actorProfile.email || userEmail} มอบหมายงานให้ IT Staff: ${finalAssignee.full_name || finalAssignee.email} | ระดับ: ${severity}`
    } else {
      return { success: false, error: 'คุณไม่มีสิทธิ์รับเรื่องหรือมอบหมายงาน Incident' }
    }

    const { data: updatedRows, error } = await supabaseAdmin
      .from('incidents')
      .update({
        status: 'In Progress',
        severity: severity,
        assigned_to_id: finalAssignee.id,
        assigned_to: finalAssignee.full_name || finalAssignee.email,
        acknowledged_at: new Date().toISOString(),
        assigned_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'Open')
      .select('id')

    if (error) throw error
    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'ไม่สามารถรับเรื่องได้ อาจมีผู้ใช้อื่นดำเนินการไปแล้ว' }
    }

    await recordLog(
      id, 
      'incident', 
      actionName, 
      logDetails, 
      userEmail
    )

    return { success: true }
  } catch (err) {
    console.error('acknowledgeIncident Error:', err)
    await recordSystemError('Incident', `Acknowledge Incident failed for ID ${id}: ${err.message}`, { error: err, id })
    return { success: false, error: err.message }
  }
}
