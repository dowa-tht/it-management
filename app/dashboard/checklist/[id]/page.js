'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'
import { isSubstituteOf } from '@/lib/workflow'
import { recordLog, submitRequest, getDocumentWorkflowStatus, submitApprovalStep, resetDocumentWorkflow, rejectDocumentWorkflow } from '@/app/actions/workflow'
import { WorkflowProgressBar } from '@/components/workflow/WorkflowProgressBar'
import { UnifiedApprovalModal } from '@/components/workflow/UnifiedApprovalModal'
import { WorkflowActionBar } from '@/components/workflow/WorkflowActionBar'

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
  const [activeNgItem, setActiveNgItem] = useState(null)
  const [activeInstruction, setActiveInstruction] = useState(null)
  const [templates, setTemplates] = useState([]) 
  const [currentUser, setCurrentUser] = useState(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [workflowSteps, setWorkflowSteps] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          setCurrentUser(profile)
        })
      }
    })
    fetchData()
  }, [id])

  const isAuditor = currentUser?.role === 'auditor'

  const fetchData = async () => {
    setLoading(true)
    const [{ data: docData }, { data: itemsData }, { data: logsData }, { data: templateData }] = await Promise.all([
      supabase.from('checklist_docs').select('*').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('doc_id', id).order('created_at', { ascending: true }),
      supabase.from('system_audit_logs').select('*').eq('doc_id', id).eq('doc_type', 'checklist').order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*')
    ])

    if (docData) setDoc(docData)
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
  }

  const handleSubmitApproval = async () => {
    if (!confirm('ยืนยันการส่งใบงานนี้เพื่อขออนุมัติ? เมื่อส่งแล้วจะไม่สามารถแก้ไขข้อมูลได้')) return
    setSaving(true)
    try {
      const res = await submitRequest(id, 'checklist', doc.freq_type, currentUser.email)
      if (res.success) fetchData()
      else alert(res.error)
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const handleApprove = async ({ pin, signatureData, comment }) => {
    setApprovalLoading(true)
    try {
      const currentStep = workflowSteps.find(s => s.status === 'pending')
      if (!currentStep) throw new Error('No pending step found')
      const res = await submitApprovalStep(id, 'checklist', currentStep.id, signatureData, comment, pin)
      if (res.success) {
        alert('✅ อนุมัติเรียบร้อย')
        setShowSignatureModal(false); fetchData()
      } else alert(res.error)
    } catch (err) { alert(err.message) }
    setApprovalLoading(false)
  }

  const handleReject = async () => {
    const reason = prompt('กรุณาระบุเหตุผลที่ตีกลับงานนี้:')
    if (!reason) return
    const res = await rejectDocumentWorkflow(id, 'checklist', reason)
    if (res.success) fetchData()
    else alert(res.error)
  }

  const handleReopen = async () => {
    if (!confirm('ต้องการ Reopen เอกสารนี้ใช่หรือไม่? ลายเซ็นเดิมจะถูกลบออกทั้งหมด')) return
    setSaving(true)
    await resetDocumentWorkflow(id, 'checklist')
    await supabase.from('checklist_docs').update({ status: 'Open', workflow_status: null, approved_at: null, approved_by: null }).eq('id', id)
    await fetchData(); setSaving(false)
  }

  const updateItemData = async (itemId, newData) => {
    const updatedItems = [...items]
    const itemIndex = updatedItems.findIndex(i => i.id === itemId)
    updatedItems[itemIndex].template_data = newData
    setItems(updatedItems)
    await supabase.from('checklist_items').update({ template_data: newData }).eq('id', itemId)
  }

  const handleStatusClick = async (index, newStatus) => {
    if (doc.status === 'Closed' || isAuditor) return
    const newItems = [...items]
    if (newStatus === 'NG') setActiveNgItem({ ...newItems[index], index })
    else {
      newItems[index].status = 'OK'; newItems[index].notes = ''
      setItems(newItems)
      await supabase.from('checklist_items').update({ status: 'OK', notes: '' }).eq('id', newItems[index].id)
      if (doc.status === 'Open') {
        await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
        setDoc(prev => ({ ...prev, status: 'In Progress' }))
      }
    }
  }

  const handleNgConfirm = async (notes) => {
    const newItems = [...items]
    newItems[activeNgItem.index].status = 'NG'; newItems[activeNgItem.index].notes = notes
    setItems(newItems)
    await supabase.from('checklist_items').update({ status: 'NG', notes: notes }).eq('id', newItems[activeNgItem.index].id)
    if (doc.status === 'Open') {
      await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
      setDoc(prev => ({ ...prev, status: 'In Progress' }))
    }
    setActiveNgItem(null)
  }

  if (loading) return <div className="p-20 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</div>
  if (!doc) return <div className="p-20 text-center text-slate-400">ไม่พบเอกสารนี้</div>

  const doneCount = items.filter(i => i.status).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const isClosed = doc.status === 'Closed'
  const currentStep = workflowSteps.find(s => s.status === 'pending')
  const canApprove = currentStep && (currentStep.approver_id === currentUser?.id || (currentStep.role_required === currentUser?.role && !currentStep.approver_id) || isSubstituteOf(currentUser?.role, currentStep.role_required))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '120px' }}>
      <PageStyles />
      
      {activeNgItem && <NgDialog item={activeNgItem} onConfirm={handleNgConfirm} onCancel={() => setActiveNgItem(null)} />}
      {activeInstruction && <InstructionDialog item={activeInstruction} onCancel={() => setActiveInstruction(null)} />}
      
      <UnifiedApprovalModal 
        isOpen={showSignatureModal} 
        onCancel={() => setShowSignatureModal(false)}
        onConfirm={handleApprove}
        approverName={currentStep?.role_required || currentUser?.full_name}
        userEmail={currentUser?.email}
        loading={approvalLoading}
      />

      <WorkflowActionBar 
        status={doc.status}
        canSubmit={!isClosed && doc.workflow_status !== 'pending' && progress === 100}
        canApprove={canApprove}
        canReject={canApprove}
        canReopen={(currentUser?.role === 'admin' || currentUser?.role === 'it_staff') && isClosed}
        onSave={() => alert('💾 ระบบบันทึกข้อมูลอัตโนมัติขณะแก้ไข')}
        onSubmit={handleSubmitApproval}
        onApprove={() => setShowSignatureModal(true)}
        onReject={handleReject}
        onReopen={handleReopen}
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
                  background: isClosed ? '#d1fae5' : '#eff6ff', color: isClosed ? '#065f46' : '#1d4ed8', textTransform: 'uppercase' 
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
        </div>

        {/* Main Grid */}
        <div className="checklist-grid">
          {/* Left Column: Checklist Items */}
          <div style={{ minWidth: 0 }}>
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

                  return (
                    <div key={item.id} style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', background: item.status === 'NG' ? '#fff1f2' : 'transparent' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{category}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{item.item_label}</span>
                            <button 
                              onClick={() => setActiveInstruction({ ...item, category, instruction })} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 }}
                              title="ดูคำแนะนำ"
                            >📄</button>
                          </div>
                          
                          <TemplateRenderer item={item} template={dbTemplate} onUpdate={(data) => updateItemData(item.id, data)} isClosed={isClosed} isVisitor={isAuditor} />
                          
                          {item.status === 'NG' && (
                            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>⚠️ พบปัญหา: {item.notes}</div>
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
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleStatusClick(index, 'OK')} 
                            disabled={isClosed || isAuditor} 
                            style={{ 
                              padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '12px', cursor: 'pointer',
                              background: item.status === 'OK' ? '#10b981' : '#f1f5f9', 
                              color: item.status === 'OK' ? '#fff' : '#94a3b8',
                              transition: 'all 0.2s',
                              opacity: (isClosed || isAuditor) ? 0.6 : 1,
                              boxShadow: item.status === 'OK' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                          >OK</button>
                          <button 
                            onClick={() => handleStatusClick(index, 'NG')} 
                            disabled={isClosed || isAuditor} 
                            style={{ 
                              padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '12px', cursor: 'pointer',
                              background: item.status === 'NG' ? '#dc2626' : '#f1f5f9', 
                              color: item.status === 'NG' ? '#fff' : '#94a3b8',
                              transition: 'all 0.2s',
                              opacity: (isClosed || isAuditor) ? 0.6 : 1,
                              boxShadow: item.status === 'NG' ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                            }}
                          >NG</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
    </div>
  )
}

function TemplateRenderer({ item, template, onUpdate, isClosed, isAuditor }) {
  const snapshot = item.template_data?._snapshot || {}; const type = snapshot.ui_template_type ?? template?.ui_template_type ?? 0
  const config = snapshot.config ?? template?.template_config ?? {}; const data = item.template_data || {}
  switch (type) {
    case 1: return <PhotoTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 2: return <ProcedureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 3: return <MeasureTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 4: return <LinkTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    case 5: return <SignoffTemplate item={item} config={config} data={data} onUpdate={onUpdate} disabled={isClosed || isAuditor} />
    default: return null
  }
}

function PhotoTemplate({ item, config, data, onUpdate, disabled }) {
  const points = config.photo_points || ["ภาพยืนยัน"]; const [uploading, setUploading] = useState({}); const [previewUrl, setPreviewUrl] = useState(null)
  const handleUpload = async (pointIdx, e) => {
    const file = e.target.files[0]; if (!file) return; setUploading(p => ({ ...p, [pointIdx]: true }))
    const reader = new FileReader(); reader.onload = (event) => {
      const img = new Image(); img.onload = async () => {
        const canvas = document.createElement('canvas'); const scale = 1000 / img.width
        canvas.width = 1000; canvas.height = img.height * scale; const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.font = "bold 24px Arial"; ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(10, canvas.height-45, 450, 35); ctx.fillStyle="#fff"; ctx.fillText(`DOWA IT SYSTEM | ${new Date().toLocaleString()}`, 20, canvas.height-18)
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]
        try {
          const res = await fetch('/api/upload/onedrive', { method: 'POST', body: JSON.stringify({ fileName: `checklist_${item.id}_${pointIdx}.jpg`, base64Data: base64, folderPath: 'Apps/Dowa-IT-System/Evidence' }) })
          const resJ = await res.json(); if (resJ.success) onUpdate({ ...data, photos: { ...(data.photos||{}), [pointIdx]: resJ.filePath } })
        } finally { setUploading(p => ({ ...p, [pointIdx]: false })) }
      }; img.src = event.target.result
    }; reader.readAsDataURL(file)
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {points.map((p, idx) => (
        <div key={idx} className="relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
          {uploading[idx] ? <div className="text-[10px] font-black text-blue-500 animate-pulse">UPLOADING...</div> : data.photos?.[idx] ? (
            <img src={`/api/upload/onedrive?id=${data.photos[idx]}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewUrl(`/api/upload/onedrive?id=${data.photos[idx]}`)} alt={p} />
          ) : <label className="cursor-pointer text-center p-4"><span className="text-2xl mb-2 block">📷</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{p}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(idx, e)} disabled={disabled} /></label>}
        </div>
      ))}
      {previewUrl && <div className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-10" onClick={() => setPreviewUrl(null)}><img src={previewUrl} className="max-w-full max-h-full object-contain" alt="preview" /></div>}
    </div>
  )
}

function ProcedureTemplate({ config, data, onUpdate, disabled }) {
  const [steps, setSteps] = useState([]); useEffect(() => { if (config.plan_id) supabase.from('checklist_procedure_plans').select('steps').eq('id', config.plan_id).single().then(({data}) => setSteps(data?.steps?.rows || [])) }, [config.plan_id])
  const toggle = (i) => { if (disabled) return; const s = { ...(data.steps||{}) }; if (s[i]) delete s[i]; else s[i] = new Date().toISOString(); onUpdate({ ...data, steps: s }) }
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${data.steps?.[i] ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
          <input type="checkbox" checked={!!data.steps?.[i]} onChange={() => toggle(i)} disabled={disabled} className="w-5 h-5 rounded-lg text-emerald-500" />
          <span className={`text-sm font-bold ${data.steps?.[i] ? 'text-emerald-700' : 'text-slate-600'}`}>{typeof s === 'string' ? s : Object.values(s)[0]}</span>
        </label>
      ))}
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
