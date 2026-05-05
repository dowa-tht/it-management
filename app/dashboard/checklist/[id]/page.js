'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'
import { getEligibleApprovers, isSubstituteOf } from '@/lib/workflow'
import { recordLog, submitRequest } from '@/app/actions/workflow'
import { SignatureModal } from '../components/SignatureModal'

// ===== Instruction Dialog =====
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
  const [activeNgItem, setActiveNgItem] = useState(null)
  const [activeInstruction, setActiveInstruction] = useState(null)
  const [templates, setTemplates] = useState([]) // Master List from DB
  const [userEmail, setUserEmail] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showDelegateModal, setShowDelegateModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [eligibleApprovers, setEligibleApproversList] = useState([])
  const [isSub, setIsSub] = useState(false)
  const [allApprovers, setAllApprovers] = useState([])
  const [isAutoApprove, setIsAutoApprove] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email)
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          setCurrentUser(profile)
        })
      }
    })
    fetchData()
  }, [id])

  const isVisitor = currentUser?.role === 'visitor'

  const fetchData = async () => {
    setLoading(true)
    const [{ data: docData }, { data: itemsData }, { data: logsData }, { data: templateData }] = await Promise.all([
      supabase.from('checklist_docs').select('*').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('doc_id', id).order('created_at', { ascending: true }),
      supabase.from('checklist_logs').select('*').eq('doc_id', id).order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*') // Get all templates to map categories/instructions
    ])

    if (docData) {
      setDoc(docData)
      if (currentUser?.id && docData.assigned_approver_id) {
        const subCheck = await isSubstituteOf(currentUser.id, docData.assigned_approver_id)
        setIsSub(subCheck)
      }
    }
    if (itemsData) setItems(itemsData)
    if (logsData) {
      const emails = [...new Set(logsData.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabase.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])
      setLogs(logsData.map(l => ({ ...l, user_full_name: nameMap[l.user_email] || l.user_email })))
    }
    const { data: config } = await supabase.from('approval_configs')
      .select('primary_approver_id')
      .eq('target_type', 'checklist')
      .eq('freq_type', docData.freq_type)
      .single()
    setIsAutoApprove(!config || !config.primary_approver_id)

    if (templateData) setTemplates(templateData)

    if (itemsData && itemsData.length > 0) {
      const itemIds = itemsData.map(i => i.id)
      const { data: incs } = await supabase.from('incidents').select('id, ref_id, case_number, status').eq('ref_type', 'checklist').in('ref_id', itemIds)
      if (incs) setIncidents(incs)
    }

    // Fetch all potential approvers for delegation
    const { data: apprs } = await supabase.from('user_profiles').select('id, full_name, role').in('role', ['administrator', 'supervisor', 'approval']).eq('is_active', true)
    if (apprs) setAllApprovers(apprs)

    setLoading(false)
  }

  const handleDelegate = async (newApproverId) => {
    setSaving(true)
    const { error } = await supabase.from('checklist_docs').update({ assigned_approver_id: newApproverId }).eq('id', id)
    if (!error) {
      await supabase.from('checklist_logs').insert({ doc_id: id, action: 'Delegated', details: `ส่งต่องานอนุมัติให้: ${allApprovers.find(a => a.id === newApproverId)?.full_name}` })
      setShowDelegateModal(false)
      fetchData()
    }
    setSaving(false)
  }

  // Helper for Auto-OK Logic
  const checkAutoOk = (item, type, config, data) => {
    // ... (existing logic) ...
  }

  const handleSubmitApproval = async () => {
    if (!confirm('ยืนยันการส่งใบงานนี้เพื่อขออนุมัติ? เมื่อส่งแล้วจะไม่สามารถแก้ไขข้อมูลได้')) return
    setSaving(true)
    
    try {
      // 1. Save all items first to ensure data persistence
      const itemsToUpdate = items
        .filter(item => item.status)
        .map(item => ({
          id: item.id,
          doc_id: id,
          item_key: item.item_key,
          item_label: item.item_label,
          status: item.status,
          notes: item.notes || '',
          template_data: item.template_data || {}
        }))

      if (itemsToUpdate.length > 0) {
        await supabase.from('checklist_items').upsert(itemsToUpdate)
      }

      // 2. Submit Request
      const res = await submitRequest(id, 'checklist', doc.freq_type, currentUser.email)
      if (res.success) {
        fetchData()
      } else {
        alert(`เกิดข้อผิดพลาด: ${res.error}`)
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setSaving(false)
  }

  const handleCancelApproval = async () => {
    if (!confirm('ยกเลิกการส่งอนุมัติและดึงเอกสารกลับมาแก้ไข?')) return
    setSaving(true)
    const { error } = await supabase
      .from('checklist_docs')
      .update({ workflow_status: 'draft', assigned_approver_id: null })
      .eq('id', id)
    
    if (!error) {
      await recordLog(id, 'checklist', 'Cancelled', 'ยกเลิกการส่งอนุมัติโดยผู้แจ้ง', currentUser.email)
      fetchData()
    }
    setSaving(false)
  }

  const handleApprove = async (pin, signatureData) => {
    setApprovalLoading(true)
    try {
      // 1. Verify PIN via API
      const verifyRes = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, pin })
      }).then(r => r.json())

      if (!verifyRes.success) {
        alert(verifyRes.error)
        setApprovalLoading(false)
        return
      }

      // 2. Update Document Status
      const { error } = await supabase
        .from('checklist_docs')
        .update({
          workflow_status: 'approved',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          status: 'Closed' // Auto-close when approved
        })
        .eq('id', id)

      if (error) throw error

      // 3. Log the approval with signature
      await supabase.from('checklist_logs').insert({
        doc_id: id,
        action: 'Approved',
        details: `อนุมัติใบงานโดย ${currentUser.full_name} (เซ็นหน้างาน)`,
        created_by: currentUser.id,
        metadata: { signature: signatureData }
      })

      setShowSignatureModal(false)
      fetchData()
    } catch (err) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`)
    }
    setApprovalLoading(false)
  }

  const handleReject = async () => {
    const reason = prompt('กรุณาระบุเหตุผลที่ตีกลับงานนี้:')
    if (reason === null) return // Cancel
    if (!reason.trim()) return alert('กรุณาระบุเหตุผล')

    setSaving(true)
    const { error } = await supabase
      .from('checklist_docs')
      .update({
        workflow_status: 'rejected',
        approval_comment: reason
      })
      .eq('id', id)

    if (!error) {
      await supabase.from('checklist_logs').insert({
        doc_id: id,
        action: 'Rejected',
        details: `ตีกลับงาน: ${reason}`,
        created_by: currentUser.id
      })
      fetchData()
    }
    setSaving(false)
  }

  const updateItemData = async (itemId, newData) => {
    const itemIndex = items.findIndex(i => i.id === itemId)
    if (itemIndex === -1) return

    const item = items[itemIndex]
    const template = templates.find(t => t.item_key === item.item_key || t.item_label === item.item_label)
    const snapshot = item.template_data?._snapshot || {}
    const type = snapshot.ui_template_type ?? template?.ui_template_type ?? 0
    const config = snapshot.config ?? template?.template_config ?? {}

    const updatedItems = [...items]
    updatedItems[itemIndex].template_data = newData
    
    // Auto-OK logic
    if (checkAutoOk(item, type, config, newData)) {
      updatedItems[itemIndex].status = 'OK'
    }

    setItems(updatedItems)
    
    // Instant save for template data to prevent loss
    await supabase.from('checklist_items').update({ 
      template_data: newData,
      status: updatedItems[itemIndex].status 
    }).eq('id', itemId)
  }

  const handleStatusClick = (index, newStatus) => {
    if (doc.status === 'Closed' || isVisitor) return

    const newItems = [...items]
    if (newStatus === 'NG') {
      setActiveNgItem({ ...newItems[index], index })
    } else {
      newItems[index].status = 'OK'
      newItems[index].notes = ''
      setItems(newItems)
      
      // Auto-save on status click to prevent data loss
      supabase.from('checklist_items').update({ 
        status: 'OK', 
        notes: '' 
      }).eq('id', newItems[index].id).then()
    }
  }

  const handleNgConfirm = (notes) => {
    const newItems = [...items]
    newItems[activeNgItem.index].status = 'NG'
    newItems[activeNgItem.index].notes = notes
    setItems(newItems)
    
    // Auto-save on NG confirm
    supabase.from('checklist_items').update({ 
      status: 'NG', 
      notes: notes 
    }).eq('id', newItems[activeNgItem.index].id).then()
    
    setActiveNgItem(null)
  }

  const handleSaveAll = async (isClosing = false) => {
    setSaving(true)
    
    // อัปเดต Items (Batch Upsert เพื่อลดจำนวน API Request)
    const itemsToUpdate = items
      .filter(item => item.status)
      .map(item => ({
        id: item.id,
        doc_id: id,
        item_key: item.item_key,
        item_label: item.item_label,
        status: item.status,
        notes: item.notes || '',
        template_data: item.template_data || {}
      }))

    if (itemsToUpdate.length > 0) {
      await supabase.from('checklist_items').upsert(itemsToUpdate)
    }

    if (isClosing) {
      await supabase.from('checklist_docs').update({ status: 'Closed' }).eq('id', id)
      await supabase.from('checklist_logs').insert([{
        doc_id: id, action: 'ปิดเอกสาร (Closed)', user_email: userEmail
      }])
    } else {
      await supabase.from('checklist_docs').update({ updated_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('checklist_logs').insert([{
        doc_id: id, action: 'บันทึกความคืบหน้า', user_email: userEmail
      }])
    }

    alert(isClosing ? '✅ ปิดเอกสารเรียบร้อย' : '💾 บันทึกความคืบหน้าสำเร็จ')
    await fetchData()
    setSaving(false)
  }

  const handleReopen = async () => {
    const reason = prompt("ระบุเหตุผลที่ต้องการเปิดเอกสารใหม่ (Reopen):")
    if (!reason) return

    setSaving(true)
    await supabase.from('checklist_docs').update({ 
      status: 'Open', 
      workflow_status: null,
      approved_at: null,
      approved_by: null,
      assigned_approver_id: null
    }).eq('id', id)
    await supabase.from('checklist_logs').insert([{
      doc_id: id, action: `เปิดเอกสารใหม่ (Reopen) - เหตุผล: ${reason}`, user_email: userEmail
    }])
    alert('เปิดเอกสารใหม่สำเร็จ')
    await fetchData()
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลด...</div>
  if (!doc) return <div style={{ padding: 40, textAlign: 'center' }}>ไม่พบเอกสารนี้</div>

  const doneCount = items.filter(i => i.status).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const isClosed = doc.status === 'Closed'

  return (
    <div style={{ padding: 24, paddingBottom: 100, maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        .photo-box:hover {
          border-color: #3b82f6 !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
      {activeNgItem && <NgDialog item={activeNgItem} onConfirm={handleNgConfirm} onCancel={() => setActiveNgItem(null)} />}
      {activeInstruction && <InstructionDialog item={activeInstruction} onCancel={() => setActiveInstruction(null)} />}

      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/checklist" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          ← กลับไปหน้ารวม
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>{doc.doc_no}</h1>
              <span style={{ 
                background: (doc.status === 'Open' && doneCount > 0) ? '#eff6ff' : isClosed ? '#d1fae5' : '#f3f4f6', 
                color: (doc.status === 'Open' && doneCount > 0) ? '#1d4ed8' : isClosed ? '#065f46' : '#4b5563', 
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1px solid ${(doc.status === 'Open' && doneCount > 0) ? '#bfdbfe' : isClosed ? '#a7f3d0' : '#e5e7eb'}`
              }}>
                {(doc.status === 'Open' && doneCount > 0) ? 'In Progress' : doc.status}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              ประเภท: <strong>{doc.freq_type}</strong> | ประจำวันที่: <strong>{formatDate(doc.period_date)}</strong>
            </div>
          </div>
          
          <div style={{ textAlign: 'right', background: '#f9fafb', padding: '12px 20px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: progress === 100 ? '#059669' : '#1d4ed8' }}>{progress}%</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>ทำแล้ว {doneCount}/{items.length}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ background: progress === 100 ? '#059669' : '#1d4ed8', height: '100%', width: `${progress}%`, borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          รายการตรวจสอบ (Checklist Items)
        </div>
        
        {items.map((item, index) => {
          // Find category and instruction from Master List (templates state)
          const dbTemplate = templates.find(t => t.item_key === item.item_key || t.item_label === item.item_label)
          
          // Fallback to static if not found in DB yet
          const staticTemplate = CHECKLIST_TEMPLATES[doc.freq_type]?.find(t => t.key === item.item_key)
          
          const snapshot = item.template_data?._snapshot || {}
          const category = snapshot.category ?? dbTemplate?.category ?? staticTemplate?.category ?? 'General'
          const instruction = snapshot.instruction ?? dbTemplate?.instruction ?? staticTemplate?.instruction

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', padding: '16px', flexWrap: 'wrap', gap: 10,
              borderBottom: '1px solid #f3f4f6', background: item.status === 'OK' ? '#f0fdf4' : item.status === 'NG' ? '#fef2f2' : '#fff',
              transition: 'background 0.2s', opacity: isClosed ? 0.7 : 1
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>{category}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{item.item_label}</div>
                  <button 
                    onClick={() => setActiveInstruction({ ...item, category, instruction })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center', opacity: 0.7 }}
                    title="วิธีตรวจสอบ"
                  >
                    📄
                  </button>
                </div>
                
                {/* Template Content Area */}
                <div style={{ marginTop: 12, width: '100%' }}>
                  <TemplateRenderer 
                    item={item} 
                    template={dbTemplate} 
                    onUpdate={(data) => updateItemData(item.id, data)}
                    isClosed={isClosed}
                    isVisitor={isVisitor}
                  />
                </div>

                {item.status === 'NG' && item.notes && (() => {
                  const relatedInc = incidents.find(inc => inc.ref_id === item.id)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6, background: '#fee2e2', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>
                        <strong>สาเหตุ:</strong> {item.notes}
                      </div>
                      {relatedInc ? (
                        <Link 
                          href={`/dashboard/incidents/${relatedInc.id}`}
                          style={{
                            padding: '6px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 6, border: '1px solid #fcd34d',
                            fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
                            alignItems: 'center', gap: 4, marginTop: 8
                          }}
                        >
                          📌 เปิดเคสแล้ว: {relatedInc.case_number} ({relatedInc.status})
                        </Link>
                      ) : !isVisitor && (
                        <Link 
                          href={`/dashboard/incidents/new?ref_type=checklist&ref_id=${item.id}&doc_no=${doc.doc_no}`}
                          style={{
                            padding: '6px 12px', background: '#dc2626', color: '#fff', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
                            alignItems: 'center', gap: 4, marginTop: 8, boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                          }}
                        >
                          🚨 เปิด Incident Case
                        </Link>
                      )}
                    </div>
                  )
                })()}
              </div>
              
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => handleStatusClick(index, 'OK')}
                  disabled={isClosed || isVisitor}
                  style={{ 
                    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (isClosed || isVisitor) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    border: item.status === 'OK' ? 'none' : '1px solid #d1d5db',
                    background: item.status === 'OK' ? '#059669' : '#fff',
                    color: item.status === 'OK' ? '#fff' : '#6b7280'
                  }}>
                  OK
                </button>
                <button 
                  onClick={() => handleStatusClick(index, 'NG')}
                  disabled={isClosed || isVisitor}
                  style={{ 
                    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (isClosed || isVisitor) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    border: item.status === 'NG' ? 'none' : '1px solid #d1d5db',
                    background: item.status === 'NG' ? '#dc2626' : '#fff',
                    color: item.status === 'NG' ? '#fff' : '#6b7280'
                  }}>
                  NG
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Audit Logs */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          ประวัติการดำเนินการ (Audit Logs)
        </div>
        <div style={{ padding: 16 }}>
          {logs.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>ไม่มีประวัติ</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div style={{ color: '#6b7280', width: 140, flexShrink: 0 }}>{formatDateTime(log.created_at)}</div>
                  <div style={{ flex: 1, color: '#111827' }}>
                    <strong>{log.action}</strong>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>โดย {log.user_full_name || 'System'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px',
        background: '#fff', borderTop: '1px solid #e5e7eb', boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.05)',
        zIndex: 100
      }}>
        <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 220 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            สถานะเวิร์กโฟลว์: <span style={{ fontWeight: 700, color: '#111827', textTransform: 'uppercase' }}>{doc.workflow_status || 'Draft'}</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {/* 1. Assignee Actions (Draft/Rejected/Null) */}
            {(doc.workflow_status === 'draft' || doc.workflow_status === 'rejected' || !doc.workflow_status) && (
              currentUser?.id === doc.created_by || currentUser?.role === 'administrator' ? (
                <>
                  <button onClick={() => handleSaveAll(false)} disabled={saving} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>
                    💾 บันทึกร่าง
                  </button>
                  <button 
                    onClick={handleSubmitApproval} 
                    disabled={saving || progress < 100}
                    style={{ padding: '10px 24px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, background: progress < 100 ? '#9ca3af' : '#1d4ed8', color: '#fff', cursor: progress < 100 ? 'not-allowed' : 'pointer' }}
                  >
                    {isAutoApprove ? '🚀 ส่งบันทึกและปิดงาน' : '🚀 ส่งขออนุมัติงาน'}
                  </button>
                </>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 13, background: '#f3f4f6', padding: '8px 16px', borderRadius: 8 }}>
                  📖 Preview Only (Draft)
                </div>
              )
            )}

            {/* 2. Pending Workflow Actions */}
            {doc.workflow_status === 'pending' && (
              <>
                {/* 2.1 Sender Role (Priority): If I am the sender, I only see Cancel, even if I am an Admin */}
                {(currentUser?.id === doc.created_by || currentUser?.email === doc.created_by) ? (
                  <button onClick={handleCancelApproval} disabled={saving} style={{ padding: '10px 24px', border: '1px solid #6b7280', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#fff', color: '#4b5563', cursor: 'pointer' }}>
                    🔄 ดึงเอกสารกลับ (Cancel)
                  </button>
                ) : (
                  <>
                    {/* 2.2 Approver Role: Strictly only Assigned Approver or their Substitute */}
                    {(!isVisitor && (
                      currentUser?.id === doc.assigned_approver_id || 
                      isSub
                    )) ? (
                      <>
                        <button onClick={() => setShowDelegateModal(true)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                          ↪️ ส่งต่อ (Delegate)
                        </button>
                        <button onClick={handleReject} style={{ padding: '10px 24px', border: '1px solid #dc2626', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
                          ❌ ตีกลับ (Reject)
                        </button>
                        <button onClick={() => setShowSignatureModal(true)} style={{ padding: '10px 24px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#059669', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' }}>
                          ✅ อนุมัติงาน (Approve)
                        </button>
                      </>
                    ) : (
                      /* 2.3 Other Role: Just Info */
                      <div style={{ color: '#6b7280', fontSize: 13, background: '#f3f4f6', padding: '8px 16px', borderRadius: 8 }}>
                        ⏳ รอการตรวจสอบโดย {doc.assigned_approver_id ? `${allApprovers.find(a => a.id === doc.assigned_approver_id)?.full_name}` : 'ระบบ Pool'}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* 3. Approved Actions */}
            {doc.workflow_status === 'approved' && (
              <div style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✅ งานนี้ได้รับการอนุมัติแล้ว
                {(currentUser?.role === 'administrator' || currentUser?.role === 'supervisor') && (
                  <button onClick={handleReopen} style={{ marginLeft: 16, padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                    ปลดล็อคเพื่อแก้ไข
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal 
        isOpen={showSignatureModal}
        onCancel={() => setShowSignatureModal(false)}
        onConfirm={handleApprove}
        approverName={currentUser?.full_name}
        userEmail={currentUser?.email}
        loading={approvalLoading}
      />

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>↪️ ส่งต่องานอนุมัติ (Delegate)</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>เลือกผู้ที่จะมารับผิดชอบการอนุมัติใบงานนี้แทนคุณ</p>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>เลือกผู้อนุมัติคนใหม่</label>
              <select 
                id="delegate-select"
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="">-- เลือกรายชื่อ --</option>
                {allApprovers.filter(a => a.id !== currentUser?.id).map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDelegateModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button 
                onClick={() => {
                  const select = document.getElementById('delegate-select');
                  if (select.value) handleDelegate(select.value);
                }} 
                style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                ยืนยันการส่งต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// Component: TemplateRenderer
// ==========================================
function TemplateRenderer({ item, template, onUpdate, isClosed, isVisitor }) {
  const snapshot = item.template_data?._snapshot || {}
  const type = snapshot.ui_template_type ?? template?.ui_template_type ?? 0
  const config = snapshot.config ?? template?.template_config ?? {}
  const data = item.template_data || {}

  switch (type) {
    case 1: return <PhotoTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isVisitor} />
    case 2: return <ProcedureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isVisitor} />
    case 3: return <MeasureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isVisitor} />
    case 4: return <LinkTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isVisitor} />
    case 5: return <SignoffTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isVisitor} />
    default: return null
  }
}

// --- T1: Photo (OneDrive Integrated) ---
function PhotoTemplate({ item, config, data, onUpdate, disabled }) {
  const points = config.photo_points || ["ภาพยืนยัน"]
  const [uploading, setUploading] = useState({}) // { [pointIdx]: true/false }
  const [previewUrl, setPreviewUrl] = useState(null)
  
  const handleUpload = async (pointIdx, e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(prev => ({ ...prev, [pointIdx]: true }))

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1000 // Reduced from 1200
        const scale = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Add Bottom Watermark (System & Time)
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "left"
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
        ctx.fillRect(10, canvas.height - 45, 450, 35)
        ctx.fillStyle = "#ffffff"
        const stamp = `DOWA IT SYSTEM | ${new Date().toLocaleString('th-TH')}`
        ctx.fillText(stamp, 20, canvas.height - 18)

        // Add Top-Right Watermark (Point Label)
        const pointLabel = points[pointIdx] || "ภาพยืนยัน"
        ctx.font = "bold 28px Arial"
        ctx.textAlign = "right"
        const textWidth = ctx.measureText(pointLabel).width
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(canvas.width - textWidth - 40, 10, textWidth + 30, 45)
        ctx.fillStyle = "#00ff00" // Use Green/Yellow for visibility
        ctx.fillText(pointLabel, canvas.width - 25, 42)
        
        // Reset textAlign for safety
        ctx.textAlign = "left"

        const dataUrl = canvas.toDataURL('image/jpeg', 0.5) // Reduced from 0.7
        const base64Data = dataUrl.split(',')[1]

        try {
          const res = await fetch('/api/upload/onedrive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `checklist_${item.id}_${pointIdx}_${Date.now()}.jpg`,
              base64Data: base64Data,
              folderPath: 'Apps/Dowa-IT-System/Checklist_Evidence'
            })
          })

          const result = await res.json()
          if (result.success) {
            const newData = { ...data, photos: { ...(data.photos || {}), [pointIdx]: result.filePath } }
            onUpdate(newData)
          } else {
            alert('อัปโหลดล้มเหลว: ' + result.error)
          }
        } catch (err) {
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message)
        } finally {
          setUploading(prev => ({ ...prev, [pointIdx]: false }))
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async (pointIdx) => {
    if (!confirm('ยืนยันการลบรูปภาพนี้?')) return
    const filePath = data.photos[pointIdx]
    
    try {
      await fetch('/api/upload/onedrive', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      })
    } catch (e) {
      console.error('Delete from OneDrive failed:', e)
    }

    const newPhotos = { ...data.photos }
    delete newPhotos[pointIdx]
    onUpdate({ ...data, photos: newPhotos })
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
        {points.map((p, idx) => {
          const fileRef = data.photos?.[idx]
          const isLocalBase64 = fileRef?.startsWith('data:image')
          const isOneDriveId = fileRef && !isLocalBase64
          const fullImageUrl = isOneDriveId ? `/api/upload/onedrive?id=${fileRef}` : fileRef
          
          return (
            <div key={idx} style={{ textAlign: 'center' }}>
              <div 
                className="photo-box"
                style={{ 
                  width: '100%', aspectRatio: '1/1', background: '#f8fafc', borderRadius: 12, 
                  border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden', transition: 'all 0.2s ease',
                  boxShadow: fileRef ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                }}>
                {uploading[idx] ? (
                  <div style={{ padding: 10, textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700, marginBottom: 8 }}>กำลังอัปโหลด...</div>
                    <div style={{ width: '80%', height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', margin: '0 auto' }}>
                      <div style={{ width: '60%', height: '100%', background: '#1d4ed8', borderRadius: 2 }}></div>
                    </div>
                  </div>
                ) : fileRef ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <img 
                      src={fullImageUrl} 
                      onClick={() => setPreviewUrl(fullImageUrl)}
                      style={{ 
                        width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in',
                        display: 'block'
                      }} 
                      alt={p}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Error Placeholder */}
                    <div style={{ display: 'none', width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#dc2626', padding: 8 }}>
                      <span style={{ fontSize: 20 }}>🖼️❌</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>โหลดรูปไม่สำเร็จ<br/>(เช็คเครื่องเซิร์ฟเวอร์)</span>
                    </div>

                    {!disabled && (
                      <button 
                        onClick={() => handleDelete(idx)}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(220, 38, 38, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ) : (
                  <label style={{ cursor: disabled ? 'default' : 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                    <span style={{ fontSize: 32, marginBottom: 8, filter: 'grayscale(1)', opacity: 0.5 }}>📷</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textAlign: 'center' }}>{p}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>คลิกเพื่ออัปโหลด</span>
                    {!disabled && (
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={(e) => handleUpload(idx, e)} 
                        style={{ display: 'none' }} 
                      />
                    )}
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Full Screen Preview Modal */}
      {previewUrl && (
        <div 
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}
        >
          <img src={previewUrl} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 0 30px rgba(0,0,0,0.5)' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 24, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
        </div>
      )}
    </>
  )
}

// --- T2: Procedure ---
function ProcedureTemplate({ config, data, onUpdate, disabled }) {
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (config.plan_id) {
       setLoading(true)
       supabase.from('checklist_procedure_plans').select('steps').eq('id', config.plan_id).single()
       .then(({data}) => {
         setSteps(data?.steps || { columns: [], rows: [] })
         setLoading(false)
       })
    }
  }, [config.plan_id])

  const toggleStep = (stepIdx) => {
    if (disabled) return
    const newSteps = { ...(data.steps || {}) }
    if (newSteps[stepIdx]) delete newSteps[stepIdx]
    else newSteps[stepIdx] = new Date().toISOString()
    onUpdate({ ...data, steps: newSteps })
  }

  const stepsData = steps?.rows || (Array.isArray(steps) ? steps : [])
  const columns = steps?.columns

  if (loading) return <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading steps...</div>

  return (
    <div style={{ background: '#f8fafc', padding: columns ? 0 : 12, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {stepsData.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: 12 }}>ไม่มีขั้นตอนระบุไว้</div> : (
        columns ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ width: 40, padding: 10 }}></th>
                  {columns.map(c => <th key={c} style={{ padding: 10, textAlign: 'left', fontWeight: 700, color: '#475569' }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {stepsData.map((row, idx) => (
                  <tr key={idx} onClick={() => toggleStep(idx)} style={{ cursor: disabled ? 'default' : 'pointer', borderTop: '1px solid #e2e8f0', background: data.steps?.[idx] ? '#ecfdf5' : '#fff' }}>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <input type="checkbox" checked={!!data.steps?.[idx]} readOnly style={{ cursor: disabled ? 'default' : 'pointer' }} />
                    </td>
                    {columns.map(c => (
                      <td key={c} style={{ padding: 10, color: data.steps?.[idx] ? '#059669' : '#334155', fontWeight: data.steps?.[idx] ? 600 : 400 }}>
                        {row[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stepsData.map((step, idx) => (
              <label key={idx} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start', cursor: disabled ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={!!data.steps?.[idx]} onChange={() => toggleStep(idx)} disabled={disabled} style={{ marginTop: 3 }} />
                <span style={{ color: !!data.steps?.[idx] ? '#059669' : '#334155', fontWeight: !!data.steps?.[idx] ? 600 : 400 }}>{step}</span>
              </label>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// --- T3: Measure ---
function MeasureTemplate({ config, data, onUpdate, disabled }) {
  const val = parseFloat(data.value)
  const isInvalid = !isNaN(val) && ( (config.min && val < config.min) || (config.max && val > config.max) )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: 200 }}>
        <input 
          type="number" 
          value={data.value || ""} 
          onChange={e => onUpdate({...data, value: e.target.value})}
          disabled={disabled}
          placeholder={`ระบุค่า (${config.unit || ""})`}
          style={{ 
            width: '100%', padding: '8px 12px', borderRadius: 8, 
            border: isInvalid ? '2px solid #ef4444' : '1px solid #d1d5db',
            background: isInvalid ? '#fef2f2' : '#fff',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
        {config.unit && <span style={{ position: 'absolute', right: 12, top: 8, color: '#94a3b8', fontSize: 12 }}>{config.unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: isInvalid ? '#ef4444' : '#6b7280', fontWeight: isInvalid ? 600 : 400 }}>
        เกณฑ์: {config.min || "—"} ถึง {config.max || "—"}
      </div>
    </div>
  )
}

// --- T4: Link ---
function LinkTemplate({ config, data, onUpdate, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <a 
          href={config.url} target="_blank" rel="noreferrer"
          onClick={() => !data.clicked && onUpdate({...data, clicked: true})}
          style={{ 
            padding: '8px 16px', background: data.clicked ? '#ecfdf5' : '#1d4ed8', 
            color: data.clicked ? '#059669' : '#fff', borderRadius: 8, fontSize: 13, 
            textDecoration: 'none', fontWeight: 600, border: data.clicked ? '1px solid #10b981' : 'none'
          }}
        >
          {data.clicked ? '✅ ตรวจสอบแล้ว' : '🌐 เปิดลิงก์ตรวจสอบ'}
        </a>
      </div>
      {config.note_required && (
        <input 
          placeholder="ระบุหมายเหตุการตรวจสอบ (บังคับ)..."
          value={data.note || ""}
          onChange={e => onUpdate({...data, note: e.target.value})}
          disabled={disabled}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: '100%', maxWidth: 400 }}
        />
      )}
    </div>
  )
}

// --- T5: Sign-off ---
function SignoffTemplate({ config, data, onUpdate, disabled }) {
  const signers = config.signers || []
  
  const handleSign = (role) => {
    if (disabled) return
    const newData = { ...data, signatures: { ...(data.signatures || {}), [role]: { signed_at: new Date().toISOString(), user: 'Current User' } } }
    onUpdate(newData)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {signers.map(role => {
        const isSigned = !!data.signatures?.[role]
        return (
          <button 
            key={role}
            onClick={() => handleSign(role)}
            disabled={disabled || isSigned}
            style={{ 
              padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: isSigned ? '#ecfdf5' : '#f3f4f6', 
              color: isSigned ? '#059669' : '#4b5563',
              border: isSigned ? '1px solid #10b981' : '1px solid #d1d5db',
              cursor: (disabled || isSigned) ? 'default' : 'pointer'
            }}
          >
            {isSigned ? `🖋️ ${role} (Signed)` : `✍️ Sign as ${role}`}
          </button>
        )
      })}
    </div>
  )
}
