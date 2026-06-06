'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'
import { isSubstituteOf } from '@/lib/workflow'
import { recordLog, submitRequest, getDocumentWorkflowStatus, submitApprovalStep, resetDocumentWorkflow, rejectDocumentWorkflow, cancelDocument, diagnoseApprovalPin } from '@/app/actions/workflow'
import { recordClientAuditLog } from '@/app/actions/audit'
import { WorkflowProgressBar } from '@/components/workflow/WorkflowProgressBar'
import { UnifiedApprovalModal } from '@/components/workflow/UnifiedApprovalModal'
import { WorkflowActionBar } from '@/components/workflow/WorkflowActionBar'
import { useWorkflowNotification } from '@/components/workflow/WorkflowNotification'
import { getCurrentActorProfile } from '@/app/actions/user'

// Local CSS for Media Queries and Layout
const PageStyles = () => (
  <style>{`
    .checklist-container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 32px 24px; 
    }
    .checklist-grid { 
      display: grid; 
      grid-template-columns: 1fr; 
      gap: 24px; 
    }
    .premium-card {
      background: #fff;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
      border: 1px solid #f1f5f9;
      margin-bottom: 24px;
    }
    
    @media (min-width: 1024px) {
      .checklist-grid { 
        grid-template-columns: 2fr 1fr; 
        gap: 32px;
      }
      .premium-card {
        padding: 32px;
        border-radius: 24px;
      }
    }

    @media (max-width: 768px) {
      .checklist-container {
        padding: 20px 16px;
      }
      .checklist-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 20px !important;
      }
      .header-title {
        font-size: 24px !important;
      }
      .premium-card {
        padding: 20px;
        border-radius: 16px;
      }
    }

    .field-label {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      min-height: 24px;
    }
  `}</style>
)
function InstructionDialog({ item, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.category}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{item.item_label}</div>
          </div>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
        </div>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          <strong>📝 วิธีการตรวจสอบ:</strong><br />
          {item.instruction || 'ไม่มีคำแนะนำเพิ่มเติมสำหรับหัวข้อนี้'}
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button onClick={onCancel} style={{ padding: '8px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ตกลง</button>
        </div>
      </div>
    </div>
  )
}

// ===== NG Dialog =====
function NgDialog({ item, onConfirm, onCancel }) {
  const [notes, setNotes] = useState(item.notes || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠️ ระบุปัญหา (NG)</div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>หัวข้อ: {item.item_label}</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="กรุณาระบุรายละเอียดหรืออาการที่พบ..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button onClick={() => onConfirm(notes)} disabled={!notes.trim()} style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: notes.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: notes.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>บันทึก NG</button>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasIncompleteT2, setHasIncompleteT2] = useState(false)
  const [activeNgItem, setActiveNgItem] = useState(null)
  const [activeInstruction, setActiveInstruction] = useState(null)
  const [templates, setTemplates] = useState([]) 
  const [currentUser, setCurrentUser] = useState(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [workflowSteps, setWorkflowSteps] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Time tracking states
  const [startTime, setStartTime] = useState('')
  const [isSavingTime, setIsSavingTime] = useState(false)

  // Substitute check state (isSubstituteOf is async — must resolve separately)
  const [isSubstitute, setIsSubstitute] = useState(false)
  const [showRemoteModal, setShowRemoteModal] = useState(false)

  const { NotificationComponent, showToast, showModal } = useWorkflowNotification()

  const auditChecklistItemChange = async (item, before, after, allowlist, details) => {
    await recordClientAuditLog({
      scope: 'document',
      entityType: 'checklist',
      entityId: item?.id || id,
      entityLabel: doc?.doc_no || id,
      sourceModule: 'checklist_detail_item',
      action: 'Updated',
      details,
      before,
      after,
      allowlist,
      metadata: {
        doc_no: doc?.doc_no || null,
        checklist_item_id: item?.id || null,
        checklist_item_label: item?.item_label || null,
      },
      docId: id,
      docType: 'checklist',
    })
  }

  const auditChecklistDocChange = async (before, after, allowlist, details) => {
    await recordClientAuditLog({
      scope: 'document',
      entityType: 'checklist',
      entityId: id,
      entityLabel: doc?.doc_no || id,
      sourceModule: 'checklist_detail',
      action: 'Updated',
      details,
      before,
      after,
      allowlist,
      metadata: {
        doc_no: doc?.doc_no || null,
      },
      docId: id,
      docType: 'checklist',
    })
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: docData }, { data: itemsData }, { data: logsData }, { data: templateData }] = await Promise.all([
      supabase.from('checklist_docs').select('*').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('doc_id', id).order('created_at', { ascending: true }),
      supabase.from('system_audit_logs').select('*').eq('doc_id', id).eq('doc_type', 'checklist').order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*')
    ])

    if (docData) {
      setDoc(docData)
      // Load start_time if exists
      if (docData.start_time) {
        const date = new Date(docData.start_time)
        const formatted = `${String(date.getDate()).padStart(2, '0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        setStartTime(formatted)
      } else {
        setStartTime('')
      }
    }
    if (itemsData) setItems(itemsData)
    if (logsData) {
      const emails = [...new Set(logsData.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabase.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])
      setLogs(logsData.map(l => ({ ...l, user_full_name: nameMap[l.user_email] || l.user_email })))
    }
    if (templateData) setTemplates(templateData)

    if (itemsData?.length > 0) {
      const itemIds = itemsData.map(i => i.id)
      const { data: incs } = await supabase.from('incidents').select('id, ref_id, case_number, status').eq('ref_type', 'checklist').in('ref_id', itemIds)
      if (incs) setIncidents(incs)
    }

    const { data: wfSteps } = await getDocumentWorkflowStatus(id)
    if (wfSteps) setWorkflowSteps(wfSteps)
    setLoading(false)
  }, [id])

  useEffect(() => {
    const load = async () => {
      const actor = await getCurrentActorProfile()
      if (actor) setCurrentUser(actor)
      await fetchData()
    }
    load()
  }, [fetchData])

  // Resolve isSubstituteOf แบบ async — รัน เมื่อ currentUser หรือ workflowSteps เปลี่ยน
  useEffect(() => {
    const checkSubstitute = async () => {
      const pendingStep = workflowSteps.find(s => s.status === 'pending')
      if (!currentUser?.id || !pendingStep?.approver_id) {
        setIsSubstitute(false)
        return
      }
      const result = await isSubstituteOf(currentUser.id, pendingStep.approver_id)
      setIsSubstitute(!!result)
    }
    checkSubstitute()
  }, [currentUser, workflowSteps])

  const isAuditor = currentUser?.role === 'auditor'
  const isClosed = doc?.status === 'Closed'
  const isLocked = isClosed || isAuditor || !isEditing

  const handleSubmitApproval = async () => {
    if (!confirm('ยืนยันการส่งใบงานนี้เพื่อขออนุมัติ? เมื่อส่งแล้วจะไม่สามารถแก้ไขข้อมูลได้')) return
    setSaving(true)
    try {
      const res = await submitRequest(id, 'checklist', doc.freq_type, currentUser.email)
      if (res.success) {
        await fetchData()
        router.refresh()
        showModal({
          title: 'ส่งเอกสารสำเร็จ! 🎉',
          message: 'ใบงาน Checklist นี้ได้รับการส่งเข้าสู่ระบบขออนุมัติเรียบร้อยแล้ว',
          type: 'success'
        })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setSaving(false)
  }

  const handleApprove = async ({ pin, signatureData, comment }) => {
    setApprovalLoading(true)
    try {
      const currentStep = workflowSteps.find(s => s.status === 'pending')
      if (!currentStep) throw new Error('No pending step found')
      const res = await submitApprovalStep(id, 'checklist', currentStep.id, signatureData, comment, pin, currentStep.approver_id || null)
      if (res.success) {
        setShowSignatureModal(false)
        showModal({
          title: 'อนุมัติสำเร็จ',
          message: `อนุมัติเอกสารเลขที่ ${doc?.doc_no || id} แล้ว`,
          type: 'success',
          onClose: async () => {
            await fetchData()
            router.refresh()
          }
        })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setApprovalLoading(false)
  }

  const handleRemoteApprove = async ({ pin, signatureData, comment }) => {
    setApprovalLoading(true)
    try {
      const currentStep = workflowSteps.find(s => s.status === 'pending')
      if (!currentStep) throw new Error('No pending step found')
      const res = await submitApprovalStep(id, 'checklist', currentStep.id, signatureData, comment, pin, currentStep.approver_id || null)
      if (res.success) {
        setShowRemoteModal(false)
        showModal({
          title: 'อนุมัติสำเร็จ',
          message: `อนุมัติเอกสารเลขที่ ${doc?.doc_no || id} แล้ว`,
          type: 'success',
          onClose: async () => {
            await fetchData()
            router.refresh()
          }
        })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setApprovalLoading(false)
  }

  const handleReject = async () => {
    const reason = prompt('กรุณาระบุเหตุผลที่ตีกลับงานนี้:')
    if (!reason) return
    try {
      const res = await rejectDocumentWorkflow(id, 'checklist', reason)
      if (res.success) {
        await fetchData()
        router.refresh()
        showToast({ message: '↩️ ตีกลับเอกสารเรียบร้อย', type: 'success' })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }

  const handleReopen = async () => {
    if (!confirm('ต้องการ Reopen เอกสารนี้ใช่หรือไม่? ลายเซ็นเดิมจะถูกลบออกทั้งหมด')) return
    const reason = prompt('กรุณาระบุเหตุผลในการ Reopen (ไม่บังคับ):') || ''
    setSaving(true)
    try {
      const res = await resetDocumentWorkflow(id, 'checklist', reason)
      if (!res?.success) throw new Error(res?.error || 'ไม่สามารถ Reopen เอกสารได้')
      await fetchData()
      router.refresh()
      showToast({ message: '🔓 เปิดเอกสารใหม่เรียบร้อย', type: 'success' })
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setSaving(false)
  }

  const updateItemData = async (itemId, newData) => {
    if (isLocked) return
    const updatedItems = [...items]
    const itemIndex = updatedItems.findIndex(i => i.id === itemId)
    const currentItem = updatedItems[itemIndex]
    const before = { template_data: currentItem?.template_data || null }
    updatedItems[itemIndex].template_data = newData
    setItems(updatedItems)
    await supabase.from('checklist_items').update({ template_data: newData }).eq('id', itemId)
    await auditChecklistItemChange(currentItem, before, { template_data: newData }, ['template_data'], 'Updated checklist template data')
  }

  // Time Tracking Functions
  const parseTimeInput = (timeStr) => {
    // Parse HH:mm format to minutes
    const match = timeStr?.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
    return hours * 60 + minutes
  }

  const formatMinutesToHHMM = (minutes) => {
    if (!minutes || minutes <= 0) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const calculateEndTime = () => {
    if (!doc?.start_time) return null
    const startDate = new Date(doc.start_time)
    const totalMinutes = items.reduce((sum, item) => {
      const uiType = item.template_data?._snapshot?.ui_template_type ?? 0
      if (uiType === 2) {
        // T2: ใช้ total_sub_duration_minutes ที่คำนวณจาก sub-steps
        return sum + (item.template_data?.total_sub_duration_minutes || 0)
      }
      return sum + (item.duration_minutes || 0)
    }, 0)
    if (totalMinutes <= 0) return null
    const endDate = new Date(startDate.getTime() + totalMinutes * 60000)
    return `${String(endDate.getDate()).padStart(2, '0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][endDate.getMonth()]}/${endDate.getFullYear()} ${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  }

  const saveStartTime = async (value) => {
    // Parse DD/MMM/YYYY HH:mm format
    const match = value?.match(/^(\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4}) (\d{2}):(\d{2})$/)
    if (!match) {
      showToast({ message: 'รูปแบบเวลาไม่ถูกต้อง (DD/MMM/YYYY HH:mm)', type: 'error' })
      return
    }
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthIndex = monthNames.indexOf(match[2])
    const date = new Date(parseInt(match[3]), monthIndex, parseInt(match[1]), parseInt(match[4]), parseInt(match[5]))

    setIsSavingTime(true)
    try {
      const before = { start_time: doc?.start_time || null }
      await supabase.from('checklist_docs').update({ start_time: date.toISOString() }).eq('id', id)
      setDoc(prev => ({ ...prev, start_time: date.toISOString() }))
      await auditChecklistDocChange(before, { start_time: date.toISOString() }, ['start_time'], 'Updated checklist start time')
      showToast({ message: 'บันทึกเวลาเริ่มต้นเรียบร้อย', type: 'success' })
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setIsSavingTime(false)
  }

  const updateItemDuration = async (itemId, durationValue) => {
    if (isLocked) return
    const minutes = parseTimeInput(durationValue)
    if (durationValue && minutes === null) {
      showToast({ message: 'รูปแบบเวลาไม่ถูกต้อง (HH:mm)', type: 'error' })
      return
    }

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, duration_minutes: minutes } : item
    )
    const currentItem = items.find((item) => item.id === itemId)
    setItems(updatedItems)

    // Calculate and update total duration
    const totalMinutes = updatedItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0)

    try {
      const beforeItem = { duration_minutes: currentItem?.duration_minutes ?? null }
      const beforeDoc = { total_duration_minutes: doc?.total_duration_minutes ?? null }
      await supabase.from('checklist_items').update({ duration_minutes: minutes }).eq('id', itemId)
      await supabase.from('checklist_docs').update({ total_duration_minutes: totalMinutes }).eq('id', id)
      setDoc(prev => ({ ...prev, total_duration_minutes: totalMinutes }))
      await auditChecklistItemChange(currentItem, beforeItem, { duration_minutes: minutes }, ['duration_minutes'], 'Updated checklist item duration')
      await auditChecklistDocChange(beforeDoc, { total_duration_minutes: totalMinutes }, ['total_duration_minutes'], 'Updated checklist total duration')
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }

  const updateItemEvaluation = async (itemId, evaluation) => {
    if (isLocked) return
    const currentItem = items.find((item) => item.id === itemId)
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, evaluation_result: evaluation } : item
    )
    setItems(updatedItems)
    try {
      await supabase.from('checklist_items').update({ evaluation_result: evaluation }).eq('id', itemId)
      await auditChecklistItemChange(currentItem, { evaluation_result: currentItem?.evaluation_result ?? null }, { evaluation_result: evaluation }, ['evaluation_result'], 'Updated checklist item evaluation')
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }

  const handleStatusClick = async (index, newStatus) => {
    if (isLocked) return
    const newItems = [...items]
    if (newStatus === 'NG') setActiveNgItem({ ...newItems[index], index })
    else {
      const currentItem = newItems[index]
      newItems[index].status = 'OK'; newItems[index].notes = ''
      setItems(newItems)
      await supabase.from('checklist_items').update({ status: 'OK', notes: '' }).eq('id', newItems[index].id)
      await auditChecklistItemChange(currentItem, { status: currentItem?.status ?? null, notes: currentItem?.notes ?? '' }, { status: 'OK', notes: '' }, ['status', 'notes'], 'Updated checklist item status')
      if (doc.status === 'Open') {
        await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
        setDoc(prev => ({ ...prev, status: 'In Progress' }))
        await auditChecklistDocChange({ status: doc?.status ?? null }, { status: 'In Progress' }, ['status'], 'Updated checklist document status')
      }
    }
  }

  const handleNgConfirm = async (notes) => {
    if (isLocked) return
    const newItems = [...items]
    const currentItem = newItems[activeNgItem.index]
    newItems[activeNgItem.index].status = 'NG'; newItems[activeNgItem.index].notes = notes
    setItems(newItems)
    await supabase.from('checklist_items').update({ status: 'NG', notes: notes }).eq('id', newItems[activeNgItem.index].id)
    await auditChecklistItemChange(currentItem, { status: currentItem?.status ?? null, notes: currentItem?.notes ?? '' }, { status: 'NG', notes }, ['status', 'notes'], 'Updated checklist item status')
    if (doc.status === 'Open') {
      await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
      setDoc(prev => ({ ...prev, status: 'In Progress' }))
      await auditChecklistDocChange({ status: doc?.status ?? null }, { status: 'In Progress' }, ['status'], 'Updated checklist document status')
    }
    setActiveNgItem(null)
  }

  const handleDocEvaluation = async (result) => {
    if (isLocked) return
    try {
      await supabase.from('checklist_docs').update({ evaluation_result: result }).eq('id', id)
      setDoc(prev => ({ ...prev, evaluation_result: result }))
      await auditChecklistDocChange({ evaluation_result: doc?.evaluation_result ?? null }, { evaluation_result: result }, ['evaluation_result'], 'Updated checklist document evaluation')
      showToast({ message: `บันทึกผลการประเมินเอกสารเป็น ${result} เรียบร้อยค่ะ/ครับ`, type: 'success' })
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }

  const handleDocRemarkChange = async (remarkValue) => {
    if (isLocked) return
    try {
      await supabase.from('checklist_docs').update({ evaluation_remark: remarkValue }).eq('id', id)
      setDoc(prev => ({ ...prev, evaluation_remark: remarkValue }))
      await auditChecklistDocChange({ evaluation_remark: doc?.evaluation_remark ?? '' }, { evaluation_remark: remarkValue }, ['evaluation_remark'], 'Updated checklist document remark')
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }


  const handleT2ItemComplete = async (itemId, status, totalSubMinutes, incomplete) => {
    if (isLocked) return
    // track incomplete state สำหรับ block save
    setHasIncompleteT2(!!incomplete)
    const newStatus = status || null
    const currentItem = items.find((item) => item.id === itemId)
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    )
    setItems(updatedItems)
    try {
      const beforeDoc = {
        total_duration_minutes: doc?.total_duration_minutes ?? null,
        evaluation_result: doc?.evaluation_result ?? null,
        evaluation_remark: doc?.evaluation_remark ?? null,
        status: doc?.status ?? null,
      }
      await supabase.from('checklist_items').update({ status: newStatus }).eq('id', itemId)
      await auditChecklistItemChange(currentItem, { status: currentItem?.status ?? null }, { status: newStatus }, ['status'], 'Updated checklist T2 item status')
      if (typeof totalSubMinutes === 'number' && totalSubMinutes >= 0) {
        await supabase.from('checklist_docs').update({ total_duration_minutes: totalSubMinutes }).eq('id', id)
        setDoc(prev => ({ ...prev, total_duration_minutes: totalSubMinutes }))
      }
      if (!newStatus && doc.evaluation_result) {
        await supabase.from('checklist_docs').update({ evaluation_result: null, evaluation_remark: null }).eq('id', id)
        setDoc(prev => ({ ...prev, evaluation_result: null, evaluation_remark: null }))
      }
      if (newStatus && doc.status === 'Open') {
        await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
        setDoc(prev => ({ ...prev, status: 'In Progress' }))
      }
      await auditChecklistDocChange(beforeDoc, {
        total_duration_minutes: typeof totalSubMinutes === 'number' && totalSubMinutes >= 0 ? totalSubMinutes : doc?.total_duration_minutes ?? null,
        evaluation_result: !newStatus && doc.evaluation_result ? null : doc?.evaluation_result ?? null,
        evaluation_remark: !newStatus && doc.evaluation_result ? null : doc?.evaluation_remark ?? null,
        status: newStatus && doc.status === 'Open' ? 'In Progress' : doc?.status ?? null,
      }, ['total_duration_minutes', 'evaluation_result', 'evaluation_remark', 'status'], 'Updated checklist T2 completion state')
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
  }

  const handleSaveEdit = async () => {
    if (hasIncompleteT2) {
      showToast({ message: '⚠️ ยังมี Step ที่ยังไม่สมบูรณ์ — กรุณาระบุผลการประเมิน (OK/NG) และระยะเวลาที่ใช้ให้ครบก่อนบันทึก', type: 'error' })
      return
    }
    setSaving(true)
    setTimeout(() => {
      setIsEditing(false)
      setSaving(false)
    }, 400)
  }

  const handleCancelEdit = async () => {
    setIsEditing(false)
    await fetchData()
  }

  const handleCancel = async () => {
    setShowCancelDialog(true)
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      showToast({ message: 'กรุณาระบุเหตุผลในการยกเลิก', type: 'error' })
      return
    }
    setCancelLoading(true)
    try {
      const res = await cancelDocument(id, 'checklist', cancelReason)
      if (res.success) {
        setShowCancelDialog(false)
        setCancelReason('')
        await fetchData()
        showModal({
          title: 'ยกเลิกเอกสารสำเร็จ',
          message: `เอกสาร ${res.docNo} ถูกยกเลิกเรียบร้อยแล้ว`,
          type: 'success'
        })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setCancelLoading(false)
  }

  // Cancel Dialog JSX
  const renderCancelDialog = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 450 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>🚫 ยกเลิกเอกสาร</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          คุณกำลังจะยกเลิกเอกสาร <strong>{doc?.doc_no}</strong><br/>
          เมื่อยกเลิกแล้วจะไม่สามารถแก้ไขหรือส่งขออนุมัติได้อีก
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>เหตุผลในการยกเลิก *</label>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="ระบุเหตุผล..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
            disabled={cancelLoading}
            style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirmCancel}
            disabled={cancelLoading || !cancelReason.trim()}
            style={{ padding: '10px 24px', border: 'none', borderRadius: 8, fontSize: 13, background: cancelReason.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 600 }}
          >
            {cancelLoading ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="p-20 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</div>
  if (!doc) return <div className="p-20 text-center text-slate-400">ไม่พบเอกสารนี้</div>

  // คำนวณ progress โดยรองรับ T2 (Procedure Plan) — นับจาก sub-steps ที่ checked
  const getItemProgress = (item) => {
    const uiType = item.template_data?._snapshot?.ui_template_type ?? 0
    if (uiType === 2) {
      // T2: complete เมื่อ item.status = 'OK' หรือ 'NG' (set โดย handleT2StepCompletion)
      // fallback: ถ้า steps ทุก step ถูก check แล้วก็ถือว่า done
      return !!item.status
    }
    return !!item.status
  }
  const doneCount = items.filter(i => getItemProgress(i)).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const currentStep = workflowSteps.find(s => s.status === 'pending')
  // canApprove: เงื่อนไข 3 ข้อ
  // 1. มี approver_id ตรงกับ user ปัจจุบัน (specific person)
  // 2. step ไม่ได้ระบุ approver_id และ role_required ตรงกับ user role
  // 3. user เป็น substitute ที่ได้รับการแต่งตั้งให้แทน approver
  const canApprove = !!(currentStep && (
    currentStep.approver_id === currentUser?.id ||
    (!currentStep.approver_id && currentStep.role_required === currentUser?.role) ||
    isSubstitute
  ))
  const normalizedRole = String(currentUser?.role || '').toLowerCase() === 'administrator' ? 'admin' : currentUser?.role
  // Phase D policy: Remote Approve สำหรับ Checklist จำกัดเฉพาะ admin / it_staff
  const canRemoteApprove = !!(
    doc.status === 'Pending Approval' &&
    !canApprove &&
    ['admin', 'it_staff'].includes(normalizedRole)
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '120px' }}>
      <PageStyles />
      
      {activeNgItem && <NgDialog item={activeNgItem} onConfirm={handleNgConfirm} onCancel={() => setActiveNgItem(null)} />}
      {activeInstruction && <InstructionDialog item={activeInstruction} onCancel={() => setActiveInstruction(null)} />}
      {showCancelDialog && renderCancelDialog()}
      
      {/* Login Approve Modal — ไม่ต้อง PIN */}
      <UnifiedApprovalModal
        isOpen={showSignatureModal}
        onCancel={() => setShowSignatureModal(false)}
        onConfirm={handleApprove}
        approverName={currentUser?.full_name}
        approverEmail={currentUser?.email}
        userEmail={currentUser?.email}
        loading={approvalLoading}
        isRemote={false}
        title="ยืนยันการอนุมัติเอกสาร"
      />
      {/* Remote Approve Modal — ต้อง PIN ของ Approver จริง */}
      <UnifiedApprovalModal
        isOpen={showRemoteModal}
        onCancel={() => setShowRemoteModal(false)}
        onConfirm={handleRemoteApprove}
        approverName={currentStep?.user_profiles?.full_name || currentStep?.role_required}
        approverEmail={currentStep?.user_profiles?.email}
        userEmail={currentStep?.user_profiles?.email}
        identityHint={!currentStep?.approver_id ? `Role ${String(currentStep?.role_required || '').replace('_', ' ')} ทั้งหมด` : ''}
        loading={approvalLoading}
        isRemote={true}
        title="อนุมัติแทน (Remote Approve)"
        onVerifyCode={async ({ mode, code }) => {
          if (mode === 'otp') return { success: false, message: 'Checklist ใช้ PIN เท่านั้น' }
          const pendingStep = workflowSteps.find(s => s.status === 'pending')
          if (!pendingStep) return { success: false, message: 'ไม่พบขั้นตอนอนุมัติที่รอดำเนินการ' }
          const res = await diagnoseApprovalPin(id, 'checklist', pendingStep.id, code)
          if (res.success) return { success: true, message: `PIN ถูกต้องสำหรับ ${res.approver?.full_name || res.approver?.email || 'ผู้อนุมัติ'}` }
          return { success: false, message: res.error || 'PIN ไม่ถูกต้อง' }
        }}
      />

      <WorkflowActionBar
        status={doc.status}
        canEdit={!isClosed && !isAuditor && doc.status !== 'Cancelled'}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={handleCancelEdit}
        onSave={handleSaveEdit}
        canSubmit={!isClosed && doc.workflow_status !== 'pending' && progress === 100 && (doc.evaluation_result === 'OK' || (doc.evaluation_result === 'NG' && doc.evaluation_remark && doc.evaluation_remark.trim().length > 0)) && !isEditing && doc.status !== 'Cancelled'}
        canApprove={canApprove && doc.status !== 'Cancelled'}
        canReject={canApprove && doc.status !== 'Cancelled'}
        canRemoteApprove={canRemoteApprove}
        canReopen={(currentUser?.role === 'admin' || currentUser?.role === 'it_staff') && isClosed}
        canCancel={doc.status !== 'Cancelled' && doc.status !== 'Closed' && (currentUser?.role === 'admin' || currentUser?.id === doc?.created_by_id)}
        onSubmit={handleSubmitApproval}
        onApprove={() => setShowSignatureModal(true)}
        onRemoteApprove={() => setShowRemoteModal(true)}
        onReject={handleReject}
        onReopen={handleReopen}
        onCancel={handleCancel}
        loading={saving || approvalLoading}
      />

      <div className="checklist-container">
        {/* Header Section */}
        <div className="checklist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '32px', paddingTop: '32px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <Link href="/dashboard/checklist" style={{ 
              width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', 
              textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
            }}>
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 className="header-title" style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>{doc.doc_no}</h1>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 900,
                  background: isClosed ? '#d1fae5' : doc.status === 'Cancelled' ? '#fee2e2' : '#eff6ff',
                  color: isClosed ? '#065f46' : doc.status === 'Cancelled' ? '#dc2626' : '#1d4ed8', textTransform: 'uppercase'
                }}>{doc.status}</span>
              </div>
              <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500, margin: 0 }}>{doc.freq_type} Checklist — {formatDate(doc.period_date)}</p>
            </div>
          </div>
          
          <div style={{ 
            background: '#fff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #f1f5f9', 
            textAlign: 'right', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Completion</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>{progress}%</div>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Workflow Progress</h2>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{workflowSteps.filter(s => s.status === 'approved').length} / {workflowSteps.length} Steps Completed</div>
          </div>
          <WorkflowProgressBar currentStatus={doc.status} steps={workflowSteps} />
          {(() => {
            const rejectedStep = workflowSteps.find(s => s.status === 'rejected')
            const rejectReason = rejectedStep?.comment?.replace(/^Rejected:\s*/i, '')
            if (!rejectedStep || !rejectReason) return null
            return (
              <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecaca', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '18px', lineHeight: 1 }}>↩️</div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>เหตุผลที่ตีกลับ (Rejected)</div>
                  <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>{rejectReason}</div>
                  {rejectedStep.action_at && (
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      {new Date(rejectedStep.action_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                      {rejectedStep.user_profiles?.full_name && ` — โดย ${rejectedStep.user_profiles.full_name}`}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Time Tracking Section */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>⏱️ ข้อมูลเวลาการดำเนินการ</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Start Time Input */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>เวลาเริ่มต้น</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  onBlur={() => saveStartTime(startTime)}
                  placeholder="DD/MMM/YYYY HH:mm"
                  disabled={isLocked || isSavingTime}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: isLocked ? '#f3f4f6' : '#fff'
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>รูปแบบ: 25/May/2026 14:30</div>
            </div>

            {/* Calculated End Time */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>เวลาสิ้นสุด (คำนวณ)</label>
              <div style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: calculateEndTime() ? '#059669' : '#94a3b8',
                background: '#f8fafc'
              }}>
                {calculateEndTime() || '—'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                คำนวณจาก: เริ่ม + ผลรวมเวลาแต่ละรายการ
              </div>
            </div>

            {/* Total Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>ระยะเวลารวม</label>
              <div style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: doc?.total_duration_minutes ? '#2563eb' : '#94a3b8',
                background: '#f8fafc'
              }}>
                {doc?.total_duration_minutes ? formatMinutesToHHMM(doc.total_duration_minutes) : '—'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                ผลรวมเวลาทุกรายการ
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="checklist-grid">
          {/* Left Column: Checklist Items */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc', padding: '20px 32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }} />
                  รายการตรวจสอบ (Checklist Items)
                </h3>
              </div>
              
              <div>
                {items.map((item, index) => {
                  const dbTemplate = templates.find(t => t.item_key === item.item_key || t.item_label === item.item_label)
                  const staticTemplate = CHECKLIST_TEMPLATES[doc.freq_type]?.find(t => t.key === item.item_key)
                  const snapshot = item.template_data?._snapshot || {}
                  const category = snapshot.category ?? dbTemplate?.category ?? staticTemplate?.category ?? 'General'
                  const instruction = snapshot.instruction ?? dbTemplate?.instruction ?? staticTemplate?.instruction
                  const uiType = snapshot.ui_template_type ?? dbTemplate?.ui_template_type ?? 0
                  const isT2 = uiType === 2

                  return (
                    <div key={item.id} style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: item.status === 'NG' ? '#fff1f2' : 'transparent' }}>
                      {/* Header: Category and Item Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>{category}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{item.item_label}</span>
                        {isT2 && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: '999px', border: '1px solid #c4b5fd' }}>Procedure Plan</span>
                        )}
                      </div>

                      {/* Fields: ซ่อนสำหรับ T2 เพราะ sub-steps ของ Procedure Plan มี metadata ของตัวเอง */}
                      {!isT2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                          {/* 1. Procedure Step (ขั้นตอนการดำเนินการ) */}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>ขั้นตอนการดำเนินการ</label>
                            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              {instruction || 'ไม่มีขั้นตอนการดำเนินการ'}
                            </div>
                          </div>

                          {/* 2. Responsible Person (ผู้รับผิดชอบ) */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>ผู้รับผิดชอบ</label>
                            <input
                              type="text"
                              value={item.responsible_person || ''}
                              onChange={(e) => {
                                const updatedItems = items.map(i => i.id === item.id ? { ...i, responsible_person: e.target.value } : i)
                                setItems(updatedItems)
                              }}
                              onBlur={async () => {
                                await supabase.from('checklist_items').update({ responsible_person: item.responsible_person }).eq('id', item.id)
                              }}
                              placeholder="ชื่อผู้รับผิดชอบ"
                              disabled={isLocked}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: isLocked ? '#f3f4f6' : '#fff' }}
                            />
                          </div>

                          {/* 3. Evaluation Criteria (เกณฑ์วัดผลการซ้อม) */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>เกณฑ์วัดผลการซ้อม</label>
                            <input
                              type="text"
                              value={item.evaluation_criteria || ''}
                              onChange={(e) => {
                                const updatedItems = items.map(i => i.id === item.id ? { ...i, evaluation_criteria: e.target.value } : i)
                                setItems(updatedItems)
                              }}
                              onBlur={async () => {
                                await supabase.from('checklist_items').update({ evaluation_criteria: item.evaluation_criteria }).eq('id', item.id)
                              }}
                              placeholder="เกณฑ์การประเมิน"
                              disabled={isLocked}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: isLocked ? '#f3f4f6' : '#fff' }}
                            />
                          </div>

                          {/* 4. Duration Input (เวลาดำเนินการ HH:mm) */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>เวลาดำเนินการ</label>
                            <input
                              type="text"
                              value={formatMinutesToHHMM(item.duration_minutes)}
                              onChange={(e) => updateItemDuration(item.id, e.target.value)}
                              placeholder="HH:mm"
                              disabled={isLocked}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: isLocked ? '#f3f4f6' : '#fff' }}
                            />
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>รูปแบบ: 01:30</div>
                          </div>

                          {/* 5. Evaluation Result (ผลการประเมิน OK/NG) */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>ผลการประเมิน</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => updateItemEvaluation(item.id, 'OK')}
                                disabled={isLocked}
                                style={{
                                  flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: isLocked ? 'not-allowed' : 'pointer',
                                  background: item.evaluation_result === 'OK' ? '#10b981' : '#f1f5f9',
                                  color: item.evaluation_result === 'OK' ? '#fff' : '#64748b',
                                  opacity: isLocked ? 0.6 : 1
                                }}
                              >OK</button>
                              <button
                                onClick={() => updateItemEvaluation(item.id, 'NG')}
                                disabled={isLocked}
                                style={{
                                  flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: isLocked ? 'not-allowed' : 'pointer',
                                  background: item.evaluation_result === 'NG' ? '#dc2626' : '#f1f5f9',
                                  color: item.evaluation_result === 'NG' ? '#fff' : '#64748b',
                                  opacity: isLocked ? 0.6 : 1
                                }}
                              >NG</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Template Renderer (Existing Photo/Verification UI) */}
                      <TemplateRenderer item={item} template={dbTemplate} onUpdate={(data) => updateItemData(item.id, data)} isClosed={isLocked} isAuditor={isAuditor} onT2Complete={(status, totalSubMinutes, incomplete) => handleT2ItemComplete(item.id, status, totalSubMinutes, incomplete)} />

                      {/* NG Status Incident Link */}
                      {item.status === 'NG' && (
                        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: '#fff', border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>⚠️ พบปัญหา: {item.notes}</div>
                          {incidents.find(inc => inc.ref_id === item.id) ? (
                            <Link href={`/dashboard/incidents/${incidents.find(inc => inc.ref_id === item.id).id}`} style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textDecoration: 'underline' }}>
                              เปิดเคสแล้ว: {incidents.find(inc => inc.ref_id === item.id).case_number}
                            </Link>
                          ) : !isAuditor && (
                            <Link href={`/dashboard/incidents/new?ref_type=checklist&ref_id=${item.id}&doc_no=${doc.doc_no}`} style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textDecoration: 'underline' }}>
                              🚨 เปิด Incident Case
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Document-level Evaluation Card (when progress is 100%) */}
            {progress === 100 && (
              <div className="premium-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '4px', height: '16px', background: '#2563eb', borderRadius: '2px' }} />
                  📋 ประเมินผลระดับเอกสารภาพรวม (Final Document Evaluation)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  เมื่อตรวจสอบข้อมูลทุกรายการเสร็จสิ้นแล้ว กรุณาประเมินผลการตรวจสอบในภาพรวมของเอกสารฉบับนี้เพื่อส่งอนุมัติตามขั้นตอนถัดไป
                </p>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: doc.evaluation_result === 'NG' ? '16px' : '0' }}>
                  <button
                    onClick={() => handleDocEvaluation('OK')}
                    disabled={isLocked}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      background: doc.evaluation_result === 'OK' ? '#10b981' : '#f1f5f9',
                      color: doc.evaluation_result === 'OK' ? '#fff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: doc.evaluation_result === 'OK' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                  >
                    <span>✔️</span> OK - ผ่านการประเมิน
                  </button>
                  <button
                    onClick={() => handleDocEvaluation('NG')}
                    disabled={isLocked}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      background: doc.evaluation_result === 'NG' ? '#dc2626' : '#f1f5f9',
                      color: doc.evaluation_result === 'NG' ? '#fff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: doc.evaluation_result === 'NG' ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                    }}
                  >
                    <span>❌</span> NG - ไม่ผ่านการประเมิน
                  </button>
                </div>

                {doc.evaluation_result === 'NG' && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #fecaca', paddingTop: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
                      ระบุเหตุผล/ข้อบกพร่องที่ประเมินไม่ผ่าน (บังคับ) *
                    </label>
                    <textarea
                      value={doc.evaluation_remark || ''}
                      onChange={(e) => handleDocRemarkChange(e.target.value)}
                      placeholder="กรุณาระบุรายละเอียดข้อบกพร่องในภาพรวม..."
                      disabled={isLocked}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid #fecaca',
                        background: '#fff',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        color: '#0f172a',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: History & Metadata */}
          <div style={{ minWidth: 0 }}>
            {/* Summary Widget */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>เอกสารสรุป</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className="field-label">ผู้รับผิดชอบ</div>
                  <div className="field-value">{doc.created_by_name || doc.created_by_email || '—'}</div>
                </div>
                <div>
                  <div className="field-label">วันที่ดำเนินการ</div>
                  <div className="field-value">{formatDate(doc.period_date)}</div>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>PROGRESS BAR</div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                    <span>{doneCount} of {items.length} items</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>ประวัติกิจกรรม (History)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {logs.map((log, idx) => (
                  <div key={log.id} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '24px' }}>
                    {/* Timeline line */}
                    {idx !== logs.length - 1 && (
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: 0, width: '2px', background: '#f1f5f9' }} />
                    )}
                    {/* Dot */}
                    <div style={{ 
                      width: '16px', height: '16px', borderRadius: '50%', background: '#fff', 
                      border: '3px solid #cbd5e1', zIndex: 1, marginTop: '4px' 
                    }} />
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>{formatDateTime(log.created_at)}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>{log.action}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>โดย {log.user_full_name || log.user_email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <NotificationComponent />
    </div>
  )
}

function TemplateRenderer({ item, template, onUpdate, isClosed, isAuditor, onT2Complete }) {
  const snapshot = item.template_data?._snapshot || {}; const type = snapshot.ui_template_type ?? template?.ui_template_type ?? 0
  const config = snapshot.config ?? template?.template_config ?? {}; const data = item.template_data || {}
  switch (type) {
    case 1: return <PhotoTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 2: return <ProcedureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} onComplete={onT2Complete} />
    case 3: return <MeasureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 4: return <LinkTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 5: return <SignoffTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    default: return null
  }
}

function formatLocationBadge(meta) {
  if (!meta) return { label: 'ไม่มีพิกัด', tone: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } }
  if (meta.status === 'captured') return { label: '📍 มีพิกัด', tone: { bg: '#ecfdf5', color: '#15803d', border: '#bbf7d0' } }
  if (meta.status === 'denied') return { label: 'ปฏิเสธพิกัด', tone: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' } }
  if (meta.status === 'unsupported') return { label: 'ไม่รองรับ GPS', tone: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' } }
  if (meta.status === 'timeout') return { label: 'GPS หมดเวลา', tone: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' } }
  if (meta.status === 'error') return { label: 'GPS ผิดพลาด', tone: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' } }
  return { label: 'ไม่มีพิกัด', tone: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } }
}

function requestCurrentLocation() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({ status: 'unsupported', lat: null, lng: null, captured_at: new Date().toISOString(), message: 'Browser does not support geolocation' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'captured',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          captured_at: new Date().toISOString(),
          message: ''
        })
      },
      (error) => {
        const statusMap = {
          1: 'denied',
          2: 'error',
          3: 'timeout'
        }
        resolve({
          status: statusMap[error.code] || 'error',
          lat: null,
          lng: null,
          captured_at: new Date().toISOString(),
          message: error.message || 'Unable to capture location'
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    )
  })
}

function PhotoTemplate({ item, config, data, onUpdate, disabled }) {
  // When photo_points is empty, the Target itself is the inspection point.
  // Fall back to a single generic slot so the UI always has somewhere to upload.
  const configuredPoints = Array.isArray(config.photo_points) ? config.photo_points : []
  const points = configuredPoints.length > 0 ? configuredPoints : ["ภาพยืนยัน"]
  const isPointlessMode = configuredPoints.length === 0  // Target = inspection point mode
  const [uploading, setUploading] = useState({})
  const [previewUrl, setPreviewUrl] = useState(null)
  const [attachLocation, setAttachLocation] = useState(false)
  const [locationBanner, setLocationBanner] = useState({ text: '', tone: '' })
  const showLocationToggle = config.enable_location_toggle !== false

  // Logic for completion
  const capturedCount = Object.keys(data.photos_by_point || {}).length || Object.keys(data.photos || {}).length
  // In pointless mode, completion is driven purely by min_photos (not point count)
  const totalPoints = isPointlessMode ? 0 : points.length
  const minRequired = config.min_photos || 1
  const isComplete = capturedCount >= (isPointlessMode ? minRequired : Math.max(totalPoints, minRequired))
  const gpsCount = Object.keys(data.photos_by_point || {}).length
    ? Object.values(data.photo_meta_by_point || {}).filter(m => m?.status === 'captured').length
    : Object.values(data.photo_meta || {}).filter(m => m?.status === 'captured').length

  const handleUpload = async (pointIdx, e) => {
    if (disabled) {
      alert('⚠️ ไม่สามารถแก้ไขรูปภาพได้ในขณะนี้ กรุณากดปุ่ม "แก้ไข" ที่แถบด้านล่างก่อนดำเนินการ')
      return
    }
    const file = e.target.files[0]
    if (!file) return

    setUploading(p => ({ ...p, [pointIdx]: true }))
    setLocationBanner({ text: '', tone: '' })

    const locationMeta = attachLocation
      ? await requestCurrentLocation()
      : { status: 'skipped', lat: null, lng: null, captured_at: new Date().toISOString(), message: '' }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas')
          // Scale to limit both width and height to maximum 1000px for 50%+ file size reduction
          const scale = Math.min(1, 1000 / Math.max(img.width, img.height))
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas 2D context not available on this device');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // Premium Watermark
          ctx.fillStyle = "rgba(0,0,0,0.5)"
          ctx.fillRect(0, canvas.height - 60, canvas.width, 60)
          ctx.font = "bold 20px Arial"
          ctx.fillStyle = "#ffffff"
          ctx.fillText(`DOWA IT SYSTEM | ${new Date().toLocaleString()}`, 20, canvas.height - 35)
          if (locationMeta.status === 'captured') {
            ctx.font = "16px Arial"
            ctx.fillText(`GPS: ${locationMeta.lat.toFixed(6)}, ${locationMeta.lng.toFixed(6)}`, 20, canvas.height - 12)
          }
          
          // Compress image using JPEG quality 0.5 (Option A) to reduce size to ~50-80KB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
          if (!dataUrl || !dataUrl.includes(',')) throw new Error('Failed to generate image data URL');
          const base64 = dataUrl.split(',')[1]

          const res = await fetch('/api/upload/onedrive', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: `checklist_${item.id}_${pointIdx}_${Date.now()}.jpg`,
              base64Data: base64,
              folderPath: 'Apps/Dowa-IT-System/Evidence'
            })
          })
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server error (Status ${res.status})`);
          }

          const resJ = await res.json()
          if (resJ.success) {
            const point = points[pointIdx]
            const pointId = typeof point === 'object' ? (point.point_id || point.point_code) : `P${(pointIdx + 1).toString().padStart(2, '0')}`
            const pointLabel = typeof point === 'object' ? point.label : point

            // Identify old photo OneDrive ID if present
            const oldFilePath = data.photos_by_point?.[pointId] || data.photos?.[pointIdx]

            onUpdate({
              ...data,
              // Legacy structure
              photos: { ...(data.photos || {}), [pointIdx]: resJ.filePath },
              photo_meta: {
                ...(data.photo_meta || {}),
                [pointIdx]: {
                  file_id: resJ.filePath,
                  status: locationMeta.status,
                  lat: locationMeta.lat,
                  lng: locationMeta.lng,
                  accuracy: locationMeta.accuracy ?? null,
                  captured_at: locationMeta.captured_at,
                  point_label: pointLabel,
                  message: locationMeta.message || ''
                }
              },
              // New stable structure
              photos_by_point: { ...(data.photos_by_point || {}), [pointId]: resJ.filePath },
              photo_meta_by_point: {
                ...(data.photo_meta_by_point || {}),
                [pointId]: {
                  file_id: resJ.filePath,
                  point_id: pointId,
                  point_code: typeof point === 'object' ? point.point_code : pointId,
                  point_label: pointLabel,
                  status: locationMeta.status,
                  lat: locationMeta.lat,
                  lng: locationMeta.lng,
                  accuracy: locationMeta.accuracy ?? null,
                  captured_at: locationMeta.captured_at,
                  message: locationMeta.message || ''
                }
              }
            })

            // Asynchronously delete the old photo from OneDrive after successful upload of the new one
            if (oldFilePath && oldFilePath !== resJ.filePath) {
              console.log(`[OneDrive] Replacing old image. Triggering deletion for old ID: ${oldFilePath}`);
              fetch('/api/upload/onedrive', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filePath: oldFilePath })
              })
              .then(async (delRes) => {
                const delData = await delRes.json().catch(() => ({}));
                if (delRes.ok && delData.success) {
                  console.log(`[OneDrive] Successfully deleted old file ID: ${oldFilePath}`);
                } else {
                  console.warn(`[OneDrive] Deletion warning for old ID: ${oldFilePath}. Error:`, delData.error || delRes.statusText);
                }
              })
              .catch((delErr) => {
                console.error('[OneDrive] Failed to send delete request for old ID:', oldFilePath, delErr);
              });
            }

            if (locationMeta.status === 'captured') {
              setLocationBanner({ text: 'แนบพิกัดสำเร็จพร้อมรูปภาพ', tone: 'success' })
            } else if (locationMeta.status === 'skipped') {
              setLocationBanner({ text: 'บันทึกรูปภาพโดยไม่แนบพิกัด', tone: 'neutral' })
            } else {
              setLocationBanner({ text: 'บันทึกรูปภาพสำเร็จ แต่ไม่ได้พิกัดตำแหน่ง', tone: 'warning' })
            }
          } else {
            throw new Error(resJ.error || 'OneDrive upload succeeded but returned success: false');
          }
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          alert(`❌ อัปโหลดรูปภาพล้มเหลว: ${uploadError.message || uploadError}`);
          setLocationBanner({ text: `อัปโหลดล้มเหลว: ${uploadError.message || uploadError}`, tone: 'danger' })
        } finally {
          setUploading(p => ({ ...p, [pointIdx]: false }))
        }
      }
      
      img.onerror = () => {
        alert('❌ ไม่สามารถอ่านไฟล์ภาพได้ (Image decoding failed)');
        setLocationBanner({ text: 'ไม่สามารถอ่านไฟล์ภาพได้', tone: 'danger' });
        setUploading(p => ({ ...p, [pointIdx]: false }));
      }

      img.src = event.target.result
    }
    
    reader.onerror = () => {
      alert('❌ ไม่สามารถเปิดไฟล์ได้ (FileReader error)');
      setLocationBanner({ text: 'ไม่สามารถเปิดไฟล์ได้', tone: 'danger' });
      setUploading(p => ({ ...p, [pointIdx]: false }));
    }

    try {
      reader.readAsDataURL(file)
    } catch (readErr) {
      alert(`❌ ไม่สามารถเริ่มอ่านไฟล์ภาพ: ${readErr.message || readErr}`);
      setLocationBanner({ text: 'ล้มเหลวในการอ่านข้อมูลเบื้องต้น', tone: 'danger' });
      setUploading(p => ({ ...p, [pointIdx]: false }));
    }
    
    // Reset file input so same file can trigger onChange again if needed
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 6.1 Section Summary Header */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>จำนวนจุดทั้งหมด</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{totalPoints} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>จุด</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>ถ่ายแล้ว</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: capturedCount > 0 ? '#10b981' : '#f43f5e' }}>{capturedCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>รูป</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>พิกัด GPS</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: gpsCount > 0 ? '#3b82f6' : '#94a3b8' }}>{gpsCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>จุด</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
           <div style={{ 
             padding: '6px 12px', 
             borderRadius: '999px', 
             fontSize: '10px', 
             fontWeight: 900, 
             textAlign: 'center',
             background: isComplete ? '#d1fae5' : '#fff1f2',
             color: isComplete ? '#065f46' : '#be123c',
             border: `1px solid ${isComplete ? '#6ee7b7' : '#fecaca'}`
           }}>
             {isComplete ? '✓ ครบถ้วน' : `ขาดอีก ${Math.max(0, Math.max(totalPoints, minRequired) - capturedCount)} รูป`}
           </div>
        </div>
      </div>

      {showLocationToggle && (
        <div style={{ 
          background: attachLocation ? '#f0fdf4' : '#fff', 
          borderRadius: '16px', 
          border: '1px solid', 
          borderColor: attachLocation ? '#bbf7d0' : '#e2e8f0',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>แนบพิกัดตำแหน่ง (Optional GPS)</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>เปิดเพื่อบันทึกพิกัด GPS ลงในหลักฐานภาพ</div>
          </div>
          <button
            type="button"
            onClick={() => !disabled && setAttachLocation(prev => !prev)}
            disabled={disabled}
            style={{
              width: 50,
              height: 26,
              borderRadius: 999,
              border: 'none',
              background: attachLocation ? '#10b981' : '#cbd5e1',
              position: 'relative',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: attachLocation ? 27 : 3,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: '#fff',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>
      )}

      {/* 6.2 Per-Point Card Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '16px' 
      }}>
        {points.map((p, idx) => {
          const pointLabel = typeof p === 'string' ? p : p.label
          const pointCode = typeof p === 'string' ? `P${(idx + 1).toString().padStart(2, '0')}` : (p.point_code || `P${(idx + 1).toString().padStart(2, '0')}`)
          const pointDesc = typeof p === 'string' ? null : p.description
          
          const pointId = typeof p === 'object' ? (p.point_id || p.point_code || pointCode) : pointCode
          const photoPath = data.photos_by_point?.[pointId] || data.photos_by_point?.[pointCode] || data.photos?.[idx]
          const meta = data.photo_meta_by_point?.[pointId] || data.photo_meta_by_point?.[pointCode] || data.photo_meta?.[idx]
          
          const badge = formatLocationBadge(meta)
          const isUploading = uploading[idx]

          return (
            <div key={idx} style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative'
            }}>
              {/* Point Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{pointCode}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{pointLabel}</span>
                </div>
                {!photoPath && !isUploading && <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>ยังไม่ถ่าย</span>}
                {photoPath && <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981' }}>✓ ถ่ายแล้ว</span>}
              </div>

              {/* Point Body / Content */}
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUploading ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', letterSpacing: '1px' }}>UPLOADING...</div>
                  </div>
                ) : photoPath ? (
                  <>
                    <img 
                      src={`/api/upload/onedrive?id=${photoPath}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} 
                      onClick={() => setPreviewUrl(`/api/upload/onedrive?id=${photoPath}`)}
                      alt={pointLabel} 
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                       <span style={{ 
                         padding: '4px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 900, 
                         background: badge.tone.bg, color: badge.tone.color, border: `1px solid ${badge.tone.border}`,
                         boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                       }}>{badge.label}</span>
                    </div>
                  </>
                ) : disabled ? (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'not-allowed',
                    padding: '24px',
                    textAlign: 'center',
                    background: '#f8fafc'
                  }}>
                    <span style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📷</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>ยังไม่ได้ถ่ายภาพ</span>
                    <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '6px', fontWeight: 700 }}>กดปุ่ม "แก้ไข" เพื่อเปิดกล้อง</div>
                  </div>
                ) : (
                  <label style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '32px', marginBottom: '8px' }}>📸</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>คลิกเพื่อถ่ายภาพ</span>
                    {pointDesc && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>{pointDesc}</div>}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(idx, e)} />
                  </label>
                )}
              </div>

              {/* Point Footer / Meta */}
              {photoPath && (
                <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>บันทึกเมื่อ</div>
                      <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700 }}>{meta?.captured_at ? new Date(meta.captured_at).toLocaleString() : '—'}</div>
                    </div>
                    {!disabled && (
                      <label style={{ cursor: 'pointer', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 800, color: '#64748b' }}>
                        ถ่ายใหม่
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(idx, e)} disabled={disabled} />
                      </label>
                    )}
                  </div>
                  {meta?.status === 'captured' && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#eff6ff', borderRadius: '8px', fontSize: '10px', color: '#1d4ed8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px' }}>📍</span>
                      {meta.lat.toFixed(6)}, {meta.lng.toFixed(6)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-6" 
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }} alt="preview" />
          <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>
      )}
    </div>
  )
}

function ProcedureTemplate({ config, data, onUpdate, disabled, onComplete }) {
  const [steps, setSteps] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [ngOpenIdx, setNgOpenIdx] = useState(null)
  const [ngDraft, setNgDraft] = useState('')
  const [rawDuration, setRawDuration] = useState({})

  useEffect(() => {
    const planId = config.plan_id || config.procedure_plan_id
    if (!planId) { setLoadError('ไม่พบ Plan ID ใน snapshot'); return }
    supabase.from('checklist_procedure_plans').select('steps').eq('id', planId).single()
      .then(({ data: planData, error }) => {
        if (error) { setLoadError(`โหลด Procedure Plan ล้มเหลว: ${error.message}`); return }
        const raw = planData?.steps
        const rows = Array.isArray(raw?.rows) ? raw.rows : Array.isArray(raw) ? raw : []
        setSteps(rows)
      })
  }, [config.plan_id, config.procedure_plan_id])

  // Helper: normalize step data (backward compat — เก่าเก็บเป็น timestamp string)
  const getStepData = (i) => {
    const raw = data.steps?.[i]
    if (!raw) return { checked: false, evaluation: null, notes: '', duration_minutes: null }
    if (typeof raw === 'string') return { checked: true, evaluation: null, notes: '', duration_minutes: null }
    return { checked: !!raw.checked, evaluation: raw.evaluation || null, notes: raw.notes || '', duration_minutes: raw.duration_minutes || null }
  }

  // Step สมบูรณ์ = checked + มี evaluation + มี duration
  const isStepComplete = (i) => {
    const sd = getStepData(i)
    return sd.checked && !!sd.evaluation && !!sd.duration_minutes
  }

  // Step ที่ checked แต่ยังไม่สมบูรณ์ (ขาด eval หรือขาด duration)
  const incompleteCheckedIdx = steps.findIndex((_, i) => {
    const sd = getStepData(i)
    return sd.checked && (!sd.evaluation || !sd.duration_minutes)
  })
  const hasIncompleteStep = incompleteCheckedIdx !== -1

  const updateStep = (i, patch) => {
    if (disabled) return
    const current = getStepData(i)
    const updated = { ...current, ...patch }
    const newSteps = { ...(data.steps || {}), [i]: updated }

    // คำนวณ total duration จาก sub-steps ทั้งหมด
    const totalMinutes = Object.values(newSteps).reduce((sum, v) => {
      const mins = typeof v === 'object' ? (v.duration_minutes || 0) : 0
      return sum + mins
    }, 0)

    const newData = { ...data, steps: newSteps, total_sub_duration_minutes: totalMinutes }
    onUpdate(newData)

    // นับจำนวน step ที่สมบูรณ์ (checked + eval + duration)
    const completeCount = Object.entries(newSteps).filter(([k, v]) => {
      if (typeof v === 'string') return false // legacy — ถือว่าไม่สมบูรณ์
      return v.checked && v.evaluation && v.duration_minutes
    }).length

    const allDone = completeCount >= steps.length
    // ส่ง hasIncomplete ออกไปด้วยเพื่อ block save
    const newIncomplete = Object.values(newSteps).some(v =>
      typeof v === 'object' && v.checked && (!v.evaluation || !v.duration_minutes)
    )
    if (onComplete) onComplete(allDone ? 'OK' : null, totalMinutes, newIncomplete)
  }

  const toggleCheck = (i) => {
    if (disabled) return
    const current = getStepData(i)
    if (current.checked) {
      // Uncheck → clear evaluation และ notes ด้วย
      updateStep(i, { checked: false, evaluation: null, notes: '', duration_minutes: null })
    } else {
      // ตรวจสอบว่ามี step อื่นที่ checked แต่ยังไม่สมบูรณ์อยู่ก่อน
      if (hasIncompleteStep && incompleteCheckedIdx !== i) {
        alert(`⚠️ กรุณาทำ Step ${incompleteCheckedIdx + 1} ให้สมบูรณ์ก่อน\n(ต้องมีผลการประเมิน OK/NG และระยะเวลาที่ใช้)`)
        return
      }
      updateStep(i, { checked: true })
    }
  }

  const setEvaluation = (i, evaluation) => {
    if (evaluation === 'NG') {
      setNgOpenIdx(i)
      setNgDraft(getStepData(i).notes || '')
    } else {
      updateStep(i, { evaluation, notes: '' })
      setNgOpenIdx(null)
    }
  }

  const confirmNg = (i) => {
    updateStep(i, { evaluation: 'NG', notes: ngDraft })
    setNgOpenIdx(null)
    setNgDraft('')
  }

  // Auto-format HH:mm จาก 4 digits
  const formatDurationInput = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}:${digits.slice(2)}`
  }

  const parseDurationToMinutes = (str) => {
    const match = str?.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (m > 59) return null
    return h * 60 + m
  }

  const formatMinutes = (mins) => {
    if (!mins) return ''
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  }

  if (loadError) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>
        ⚠️ {loadError}
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '13px', color: '#94a3b8' }}>
        กำลังโหลดขั้นตอน...
      </div>
    )
  }

  const checkedWithEval = steps.filter((_, i) => {
    const d = getStepData(i)
    if (typeof data.steps?.[i] === 'string') return true
    return d.checked && d.evaluation
  }).length
  const allDone = checkedWithEval >= steps.length
  const totalSubMinutes = Object.values(data.steps || {}).reduce((sum, v) => {
    return sum + (typeof v === 'object' ? (v.duration_minutes || 0) : 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: `1px solid ${hasIncompleteStep ? '#fbbf24' : '#e2e8f0'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ความคืบหน้าขั้นตอนย่อย</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, color: allDone ? '#059669' : '#2563eb' }}>{checkedWithEval} / {steps.length}</span>
            {totalSubMinutes > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>⏱ รวม {formatMinutes(totalSubMinutes)}</span>
            )}
          </div>
        </div>
        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${steps.length > 0 ? Math.round((checkedWithEval / steps.length) * 100) : 0}%`, height: '100%', background: allDone ? '#10b981' : '#3b82f6', transition: 'width 0.3s ease', borderRadius: '3px' }} />
        </div>
        {/* Warning: step ที่ checked แต่ยังไม่ครบ */}
        {hasIncompleteStep && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '12px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ Step {incompleteCheckedIdx + 1} ยังไม่สมบูรณ์ — ต้องระบุ <span style={{ fontWeight: 900, color: '#b45309' }}>ผลการประเมิน (OK/NG)</span> และ <span style={{ fontWeight: 900, color: '#b45309' }}>ระยะเวลาที่ใช้</span> ก่อนบันทึกเอกสาร
          </div>
        )}
      </div>

      {steps.map((s, i) => {
        const stepTitle = typeof s === 'string' ? s : s.title || s.instruction || `Step ${i + 1}`
        const responsible = typeof s === 'object' ? (s.responsible_person || '') : ''
        const criteria = typeof s === 'object' ? (s.success_criteria || '') : ''
        const sd = getStepData(i)
        const isChecked = sd.checked
        const isNG = sd.evaluation === 'NG'
        const isOK = sd.evaluation === 'OK'
        const isIncomplete = isChecked && (!sd.evaluation || !sd.duration_minutes)
        const borderColor = isIncomplete ? '#fbbf24' : isNG ? '#fecaca' : isOK ? '#a7f3d0' : isChecked ? '#bfdbfe' : '#e2e8f0'
        const bgColor = isIncomplete ? '#fffbeb' : isNG ? '#fff1f2' : isOK ? '#f0fdf4' : isChecked ? '#eff6ff' : '#fff'

        return (
          <div
            key={i}
            style={{ borderRadius: '10px', border: `1px solid ${borderColor}`, overflow: 'hidden', marginBottom: '8px', background: bgColor, transition: 'all 0.2s' }}
          >
            {/* Row 1: Checkbox + Title + Duration */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px' }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCheck(i)}
                disabled={disabled}
                style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: '#10b981', flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: isOK ? '#065f46' : isNG ? '#991b1b' : isChecked ? '#1e40af' : '#334155', lineHeight: 1.5 }}>
                {stepTitle}
              </span>

              {/* Duration input HH:mm — 4-digit auto-format */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>เวลา (HH:mm)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rawDuration[i] !== undefined ? rawDuration[i] : formatMinutes(sd.duration_minutes)}
                  disabled={disabled}
                  onFocus={() => {
                    setRawDuration(p => ({ ...p, [i]: formatMinutes(sd.duration_minutes) || '' }))
                  }}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
                    const display = digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
                    setRawDuration(p => ({ ...p, [i]: display }))
                  }}
                  onBlur={() => {
                    const raw = rawDuration[i] || ''
                    const mins = parseDurationToMinutes(raw)
                    updateStep(i, { duration_minutes: mins })
                    setRawDuration(p => { const n = { ...p }; delete n[i]; return n })
                  }}
                  placeholder="00:00"
                  style={{
                    width: '72px', padding: '5px 8px', border: `1px solid ${sd.duration_minutes ? '#93c5fd' : '#e2e8f0'}`,
                    borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700,
                    textAlign: 'center', background: disabled ? '#f3f4f6' : '#fff',
                    color: sd.duration_minutes ? '#1d4ed8' : '#94a3b8',
                    cursor: disabled ? 'not-allowed' : 'text', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Row 2: Metadata (responsible, criteria) — คนละบรรทัด */}
            {(responsible || criteria) && (
              <div style={{ padding: '0 16px 8px 46px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {responsible && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', flexShrink: 0, paddingTop: '1px' }}>ผู้รับผิดชอบ:</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{responsible}</span>
                  </div>
                )}
                {criteria && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', flexShrink: 0, paddingTop: '1px' }}>เกณฑ์สำเร็จ:</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{criteria}</span>
                  </div>
                )}
              </div>
            )}

            {/* Row 3: OK/NG buttons (แสดงเมื่อ checked) */}
            {isChecked && (
              <div style={{ padding: '0 16px 12px 46px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>ผลการประเมิน:</span>
                  <button
                    onClick={() => !disabled && setEvaluation(i, 'OK')}
                    disabled={disabled}
                    style={{
                      padding: '4px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '12px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: isOK ? '#10b981' : '#f1f5f9',
                      color: isOK ? '#fff' : '#64748b',
                      boxShadow: isOK ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >✔ OK</button>
                  <button
                    onClick={() => !disabled && setEvaluation(i, 'NG')}
                    disabled={disabled}
                    style={{
                      padding: '4px 16px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '12px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: isNG ? '#dc2626' : '#f1f5f9',
                      color: isNG ? '#fff' : '#64748b',
                      boxShadow: isNG ? '0 2px 8px rgba(220,38,38,0.25)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >✘ NG</button>
                  {sd.evaluation && (
                    <span style={{
                      marginLeft: '4px', fontSize: '10px', fontWeight: 900,
                      color: isOK ? '#059669' : '#dc2626',
                      background: isOK ? '#d1fae5' : '#fee2e2',
                      padding: '2px 8px', borderRadius: '999px',
                      border: `1px solid ${isOK ? '#6ee7b7' : '#fca5a5'}`
                    }}>{isOK ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}</span>
                  )}
                </div>

                {/* NG notes (แสดงเมื่อประเมิน NG แล้ว) */}
                {isNG && sd.notes && ngOpenIdx !== i && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: '#fff', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>
                    ⚠️ {sd.notes}
                    {!disabled && (
                      <button
                        onClick={() => { setNgOpenIdx(i); setNgDraft(sd.notes) }}
                        style={{ marginLeft: '8px', fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}
                      >แก้ไข</button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NG Dialog inline */}
            {ngOpenIdx === i && (
              <div style={{ margin: '0 16px 12px 46px', padding: '12px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c', marginBottom: '8px' }}>ระบุเหตุผล NG *</div>
                <textarea
                  value={ngDraft}
                  onChange={e => setNgDraft(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="เช่น: ไม่สามารถดำเนินการได้ ต้องให้ Vendor ตรวจสอบ..."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #fed7aa', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setNgOpenIdx(null); setNgDraft('') }}
                    style={{ padding: '5px 14px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  >ยกเลิก</button>
                  <button
                    onClick={() => confirmNg(i)}
                    disabled={!ngDraft.trim()}
                    style={{ padding: '5px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: ngDraft.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: ngDraft.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >บันทึก NG</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {allDone && (
        <div style={{ marginTop: '4px', padding: '10px 16px', borderRadius: '10px', background: '#d1fae5', border: '1px solid #6ee7b7', fontSize: '13px', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✅</span> ดำเนินการครบทุกขั้นตอนแล้ว
        </div>
      )}
    </div>
  )
}

function MeasureTemplate({ config, data, onUpdate, disabled }) {
  const val = parseFloat(data.value); const isInvalid = !isNaN(val) && ((config.min && val < config.min) || (config.max && val > config.max))
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-[200px]">
        <input type="number" value={data.value || ""} onChange={e => onUpdate({...data, value: e.target.value})} disabled={disabled} placeholder={`ค่า (${config.unit})`} className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all outline-none ${isInvalid ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 focus:border-blue-500'}`} />
      </div>
      <div className={`text-[11px] font-black uppercase tracking-widest ${isInvalid ? 'text-red-500' : 'text-slate-400'}`}>Goal: {config.min}-{config.max}</div>
    </div>
  )
}

function LinkTemplate({ config, data, onUpdate, disabled }) {
  return (
    <div className="space-y-4">
      <a href={config.url} target="_blank" rel="noreferrer" onClick={() => !data.clicked && onUpdate({...data, clicked: true})} className={`inline-flex px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${data.clicked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>{data.clicked ? '✅ CHECKED' : '🌐 OPEN LINK'}</a>
      {config.note_required && <input placeholder="หมายเหตุ (บังคับ)" value={data.note || ""} onChange={e => onUpdate({...data, note: e.target.value})} disabled={disabled} className="w-full px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none" />}
    </div>
  )
}

function SignoffTemplate({ config, data, onUpdate, disabled }) {
  const signers = config.signers || []; const sign = (r) => { if (disabled) return; onUpdate({ ...data, signatures: { ...(data.signatures||{}), [r]: { signed_at: new Date().toISOString() } } }) }
  return (
    <div className="flex flex-wrap gap-2">
      {signers.map(r => (
        <button key={r} onClick={() => sign(r)} disabled={disabled || data.signatures?.[r]} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${data.signatures?.[r] ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>{data.signatures?.[r] ? `🖋️ ${r} OK` : `✍️ SIGN AS ${r}`}</button>
      ))}
    </div>
  )
}
