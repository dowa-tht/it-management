'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import SignaturePad from 'react-signature-canvas'
import { verifyEmployeePIN } from '@/app/actions/users'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { calculateNetBusinessMinutes } from '@/lib/slaUtils'
import { getPotentialWorkflowSteps, recordLog, submitRequest, getDocumentWorkflowStatus, submitApprovalStep, resetDocumentWorkflow, rejectDocumentWorkflow, syncDynamicWorkflowApprovers, diagnoseApprovalPin } from '@/app/actions/workflow'
import { acknowledgeIncident } from '@/app/actions/incidents'
import { isSubstituteOf } from '@/lib/workflow'
import { WorkflowProgressBar } from '@/components/workflow/WorkflowProgressBar'
import { UnifiedApprovalModal } from '@/components/workflow/UnifiedApprovalModal'
import { WorkflowActionBar } from '@/components/workflow/WorkflowActionBar'
import { WORKFLOW_DOC_REGISTRY } from '@/lib/workflowRegistry'

const SLA_LABELS = {
  High:   { response: 'ทันที (ภายใน 1 ชั่วโมง)', resolve: 'ภายใน 4 ชั่วโมง' },
  Medium: { response: 'ภายใน 2 ชั่วโมง',     resolve: 'ภายใน 8 ชั่วโมง' },
  Low:    { response: 'ภายใน 6 ชั่วโมง',     resolve: 'ภายใน 3 วันทำการ' }
}

const SEVERITY_COLORS = {
  High:   { color: '#dc2626', bg: '#fee2e2', text: 'HIGH' },
  Medium: { color: '#d97706', bg: '#fef3c7', text: 'MEDIUM' },
  Low:    { color: '#059669', bg: '#d1fae5', text: 'LOW' }
}

// Local CSS for Media Queries and Layout
const PageStyles = () => (
  <style>{`
    .incident-container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 32px 24px; 
    }
    .incident-grid { 
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
      .incident-grid { 
        grid-template-columns: 2fr 1fr; 
        gap: 32px;
      }
      .premium-card {
        padding: 32px;
        border-radius: 24px;
      }
    }

    @media (max-width: 768px) {
      .incident-container {
        padding: 20px 16px;
      }
      .incident-header {
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
      .field-grid {
        grid-template-columns: 1fr !important;
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

function formatElapsed(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

function SLAWidget({ label, targetLabel, start, end, severity, type, settings, holidays, exclusions }) {
  const [mins, setMins] = useState(null)
  
  useEffect(() => {
    if (!start) return
    const update = () => {
      const currentEnd = end || new Date()
      const net = calculateNetBusinessMinutes(start, currentEnd, settings, holidays, exclusions)
      setMins(net)
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [start, end, settings, holidays, exclusions])

  const reg = WORKFLOW_DOC_REGISTRY.incident
  const targetMins = type === 'response' ? 
    (reg.sla_targets[severity]?.response || 120) : 
    (reg.sla_targets[severity]?.resolve || 480)
  
  const isOver = mins > targetMins
  const isDone = !!end

  const s = isDone ? (
    isOver ? 
    { icon: '❌', color: '#dc2626', bg: '#fff1f2', border: '#fecaca', text: `Over SLA (${formatElapsed(mins)})` } :
    { icon: '✅', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', text: `Done OK (${formatElapsed(mins)})` }
  ) : (
    isOver ?
    { icon: '⏰', color: '#dc2626', bg: '#fff1f2', border: '#fecaca', text: `เกิน SLA! (${formatElapsed(mins)})` } :
    { icon: '⏳', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: `กำลังดำเนินการ (${formatElapsed(mins)})` }
  )

  return (
    <div style={{ 
      position: 'relative', 
      overflow: 'hidden', 
      borderRadius: '16px', 
      border: `1px solid ${s.border}`, 
      background: s.bg, 
      padding: '16px', 
      marginBottom: '16px' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '18px' }}>{s.icon}</div>
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>เป้าหมาย: {targetLabel}</div>
      <div style={{ fontSize: '14px', fontWeight: 800, color: s.color }}>{s.text}</div>
    </div>
  )
}

export default function IncidentDetailPage() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [logs, setLogs] = useState([])
  const [workflowSteps, setWorkflowSteps] = useState([])
  
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false)

  const [workingHours, setWorkingHours] = useState(null)
  const [holidays, setHoneydays] = useState([])
  const [exclusions, setExclusions] = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: p } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
        setCurrentUser(p)
      }
      fetchData()
    }
    init()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        { data: inc }, 
        { data: lgs }, 
        { data: settings }, 
        { data: hols }, 
        { data: excl }
      ] = await Promise.all([
        supabase.from('incidents').select('*, reporter:user_profiles!reported_by_id(full_name, email)').eq('id', id).single(),
        supabase.from('system_audit_logs').select('*').eq('doc_id', id).order('created_at', { ascending: false }),
        supabase.from('system_settings').select('*').eq('key', 'working_hours').single(),
        supabase.from('sla_holidays').select('*'),
        supabase.from('sla_exclusions').select('*').eq('incident_id', id)
      ])

      if (inc) {
        setIncident(inc)
        setForm(inc)
      }
      if (lgs) {
        const emails = [...new Set(lgs.map(l => l.user_email).filter(Boolean))]
        const { data: profiles } = await supabase.from('user_profiles').select('email, full_name').in('email', emails)
        const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])
        setLogs(lgs.map(l => ({ ...l, user_full_name: nameMap[l.user_email] || l.user_email })))
      }
      if (settings) setWorkingHours(settings.value)
      if (hols) setHoneydays(hols)
      if (excl) setExclusions(excl)

      const { data: wfs } = await getDocumentWorkflowStatus(id)
      
      const enrichSteps = (steps) => {
        return steps?.map(s => {
          // 🛡️ Step 2 in Incidents is always the Reporter
          if (s.step_order === 2 && !s.user_profiles && inc.reporter) {
            return { ...s, user_profiles: { ...inc.reporter } }
          }
          return s
        })
      }

      if (wfs && wfs.length > 0) {
        setWorkflowSteps(enrichSteps(wfs))
      } else if (inc && inc.status !== 'Closed') {
        // Preview potential steps if not yet generated
        const { data: preview } = await getPotentialWorkflowSteps('incident', inc.severity)
        setWorkflowSteps(enrichSteps(preview) || [])
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Handle Severity Change and Workflow Sync
    if (form.severity !== incident.severity) {
      if (incident.workflow_status === 'pending') {
        const confirmReset = window.confirm('⚠️ คุณกำลังเปลี่ยนระดับความรุนแรงในขณะที่เคสกำลังรออนุมัติ การดำเนินการนี้จะรีเซ็ตลำดับการอนุมัติใหม่ทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?')
        if (!confirmReset) {
          setSaving(false)
          return
        }
      }

      await recordLog(
        id, 
        'incident', 
        'Change Severity', 
        `Severity changed from ${incident.severity} to ${form.severity}`, 
        currentUser.email
      )

      if (incident.workflow_status === 'pending') {
        const reg = WORKFLOW_DOC_REGISTRY.incident
        await generateWorkflowSteps(id, 'incident', reg.condition_key, form.severity, incident.assigned_approver_id)
      }
    }

    const { reporter, ...updateData } = form
    const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
    if (error) alert(error.message)
    else {
      if (updateData.reported_by_id !== incident.reported_by_id && incident.workflow_status === 'pending') {
        const syncRes = await syncDynamicWorkflowApprovers(id, 'incident')
        if (!syncRes.success) {
          alert('บันทึกข้อมูลแล้ว แต่ไม่สามารถ Sync ผู้อนุมัติ Reporter ได้: ' + syncRes.error)
        }
      }
      setEditing(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleResolveIncident = async (resolveData) => {
    setSaving(true)
    const { signatures, reporter_pin, ...updateFields } = resolveData

    const { error: updateErr } = await supabase.from('incidents').update({
      ...updateFields,
      resolved_at: new Date().toISOString(),
      resolved_by: currentUser.id
    }).eq('id', id)

    if (updateErr) {
      alert('ไม่สามารถบันทึกข้อมูลการแก้ไขได้: ' + updateErr.message)
      setSaving(false)
      return
    }

    const signaturesWithIds = {
      ...signatures,
      it: { ...signatures.it, userId: currentUser.id },
      reporter: { ...signatures.reporter, userId: incident.reported_by_id }
    }

    const res = await submitRequest(id, 'incident', incident.severity, currentUser.email, signaturesWithIds, reporter_pin)
    if (res.success) {
      setShowResolveDialog(false)
      fetchData()
    } else {
      alert('เกิดข้อผิดพลาดในการส่งอนุมัติ: ' + res.error)
    }
    setSaving(false)
  }

  const [isRemoteApprovalMode, setIsRemoteApprovalMode] = useState(false)

  const handleApprove = async ({ pin, signatureData, comment }) => {
    setApprovalLoading(true)
    let currentStep = workflowSteps.find(s => s.status === 'pending')
    if (isRemoteApprovalMode && currentStep?.role_required === 'reporter' && !currentStep.approver_id && incident?.reported_by_id) {
      currentStep = { ...currentStep, approver_id: incident.reported_by_id }
    }
    const overrideApproverId = isRemoteApprovalMode
      ? (currentStep?.approver_id || incident?.reported_by_id || null)
      : (currentStep?.approver_id || null)
    const res = await submitApprovalStep(id, 'incident', currentStep.id, signatureData, comment, pin, overrideApproverId)
    if (res.success) {
      setShowSignatureModal(false)
      setIsRemoteApprovalMode(false)
      fetchData()
    } else alert(res.error)
    setApprovalLoading(false)
  }

  const handleRejectIncident = async () => {
    const reason = prompt('กรุณาระบุเหตุผลในการตีกลับ:')
    if (!reason) return
    const res = await rejectDocumentWorkflow(id, 'incident', reason)
    if (res.success) fetchData()
    else alert(res.error)
  }

  const handleReopen = async (reason) => {
    setSaving(true)
    const res = await resetDocumentWorkflow(id, 'incident', reason)
    if (res.success) {
      setShowReopenDialog(false)
      fetchData()
    } else alert(res.error)
    setSaving(false)
  }

  const handleAcknowledge = async (acknowledgeData) => {
    setSaving(true)
    const res = await acknowledgeIncident(id, acknowledgeData.severity, acknowledgeData.assignee_id)
    if (res.success) {
      setShowAcknowledgeDialog(false)
      fetchData()
    } else alert(res.error)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
  if (!incident) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูลเคส</div>

  const hasFullAccess = currentUser?.role === 'admin' || currentUser?.role === 'it_staff'
  const isLocked = incident.status === 'Pending Approval' || incident.status === 'Closed' || (incident.status === 'In Progress' && !hasFullAccess)
  const isAuditor = currentUser?.role === 'auditor'
  const currentStep = workflowSteps.find(s => s.status === 'pending')
  const isCreator = currentUser?.id === incident?.reported_by_id
  const latestRejectedStep = workflowSteps.find(s => s.status === 'rejected')
  const latestRejectedLog = logs.find(log => log.action === 'Rejected')
  const rejectReason = latestRejectedStep?.comment?.replace(/^Rejected:\s*/i, '') || latestRejectedLog?.details?.split('เหตุผล:').pop()?.trim() || ''
  const wasRejected = Boolean(latestRejectedStep || latestRejectedLog)
  const canApprove = currentStep && (
    currentStep.approver_id === currentUser?.id || 
    (currentStep.role_required === currentUser?.role && !currentStep.approver_id) ||
    isSubstituteOf(currentUser?.role, currentStep.role_required) ||
    (currentStep.role_required === 'reporter' && isCreator)
  )

  const canEditDetails = !isLocked && (hasFullAccess || incident.reported_by_id === currentUser?.id)
  const canSubmitForApproval = incident.status === 'In Progress' && hasFullAccess
  const canRemoteApprove = hasFullAccess && incident.status === 'Pending Approval' && !canApprove

  const field = (label, name, value, options = null) => (
    <div style={{ marginBottom: '20px' }}>
      <div className="field-label" style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      {editing ? (
        options ? (
          <select 
            value={value || ''} 
            onChange={e => setForm({ ...form, [name]: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' }}
          >
            <option value="">เลือก{label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <textarea 
            value={value || ''} 
            onChange={e => setForm({ ...form, [name]: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
            rows={3}
          />
        )
      ) : (
        <div className="field-value" style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{value || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ยังไม่มีข้อมูล —</span>}</div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '120px' }}>
      <PageStyles />
      
      {showAcknowledgeDialog && (
        <AcknowledgeDialog 
          onCancel={() => setShowAcknowledgeDialog(false)} 
          onConfirm={handleAcknowledge} 
          loading={saving} 
          currentSeverity={incident.severity}
          currentAssigneeId={currentUser?.id}
        />
      )}

      {showResolveDialog && (
        <ResolveDialog 
          onCancel={() => setShowResolveDialog(false)} 
          onConfirm={handleResolveIncident} 
          loading={saving} 
          initialData={form}
          severity={incident.severity}
          reporterName={incident.reporter?.full_name}
        />
      )}
      {showReopenDialog && <ReopenDialog onCancel={() => setShowReopenDialog(false)} onConfirm={handleReopen} loading={saving} />}
      
      <UnifiedApprovalModal
        isOpen={showSignatureModal}
        onCancel={() => { setShowSignatureModal(false); setIsRemoteApprovalMode(false); }}
        onConfirm={handleApprove}
        approverName={currentStep?.user_profiles?.full_name || (isRemoteApprovalMode && incident?.reporter?.full_name) || currentStep?.role_required || currentUser?.full_name}
        approverEmail={currentStep?.user_profiles?.email || (isRemoteApprovalMode && incident?.reporter?.email) || currentUser?.email}
        userEmail={currentStep?.user_profiles?.email || (isRemoteApprovalMode && incident?.reporter?.email) || currentUser?.email}
        loading={approvalLoading}
        isCreator={currentUser?.id === incident?.reported_by_id}
        isRemote={isRemoteApprovalMode}
        onTestPin={async (pin) => {
          const pendingStep = workflowSteps.find(s => s.status === 'pending')
          const res = await diagnoseApprovalPin(id, 'incident', pendingStep.id, pin)
          if (res.success) return { success: true, message: `PIN ถูกต้องสำหรับ ${res.approver?.full_name || res.approver?.email || 'ผู้อนุมัติ'}` }
          return { success: false, message: res.error || 'PIN ไม่ถูกต้อง', details: res }
        }}
      />

      <WorkflowActionBar 
        status={incident.status}
        canEdit={canEditDetails}
        canSubmit={canSubmitForApproval}
        canApprove={canApprove}
        canRemoteApprove={canRemoteApprove}
        canReject={canApprove}
        canReopen={hasFullAccess && (incident.status === 'Closed' || incident.status === 'Pending Approval')}
        onSave={handleSave}
        onAcknowledge={() => setShowAcknowledgeDialog(true)}
        onSubmit={() => setShowResolveDialog(true)}
        onApprove={() => { setIsRemoteApprovalMode(false); setShowSignatureModal(true); }}
        onRemoteApprove={() => { setIsRemoteApprovalMode(true); setShowSignatureModal(true); }}
        onReject={handleRejectIncident}
        onReopen={() => setShowReopenDialog(true)}
        onEdit={() => setEditing(true)}
        isEditing={editing}
        onCancelEdit={() => { setEditing(false); setForm(incident) }}
        loading={saving || approvalLoading}
      />

      <div className="incident-container">
        {/* Header Section */}
        <div className="incident-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '32px', paddingTop: '32px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <Link href="/dashboard/incidents" style={{ 
              width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', 
              textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
            }}>
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 className="header-title" style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>{incident.case_number}</h1>
                <span style={{ 
                  padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, 
                  background: '#eff6ff', color: '#1d4ed8', textTransform: 'uppercase' 
                }}>{incident.status}</span>
              </div>
              <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500, margin: 0 }}>{incident.title}</p>
            </div>
          </div>
          
          <div style={{ 
            background: '#fff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #f1f5f9', 
            textAlign: 'right', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Severity</div>
            {editing && (currentUser?.role === 'admin' || currentUser?.role === 'it_staff') ? (
              <select 
                value={form.severity || ''} 
                onChange={e => setForm({ ...form, severity: e.target.value })}
                style={{ 
                  padding: '6px 12px', borderRadius: '10px', 
                  border: `2px solid ${SEVERITY_COLORS[form.severity]?.color || '#cbd5e1'}`, 
                  background: '#fff',
                  fontSize: '14px', fontWeight: 900, color: SEVERITY_COLORS[form.severity]?.color,
                  fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <option value="High" style={{ color: SEVERITY_COLORS.High.color, fontWeight: 700 }}>🔴 High</option>
                <option value="Medium" style={{ color: SEVERITY_COLORS.Medium.color, fontWeight: 700 }}>🟠 Medium</option>
                <option value="Low" style={{ color: SEVERITY_COLORS.Low.color, fontWeight: 700 }}>🟢 Low</option>
              </select>
            ) : (
              <div style={{ fontSize: '14px', fontWeight: 900, color: SEVERITY_COLORS[incident.severity]?.color }}>
                {SEVERITY_COLORS[incident.severity]?.text || incident.severity}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Workflow Progress</h2>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{workflowSteps.filter(s => s.status === 'approved').length} / {workflowSteps.length} Steps Completed</div>
          </div>
          {wasRejected && (
            <div style={{
              marginBottom: '16px', padding: '14px 16px', borderRadius: '16px',
              background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 900, marginBottom: '6px' }}>
                <span>↩️</span>
                <span>เอกสารถูกตีกลับจากการอนุมัติ</span>
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#7c2d12' }}>
                <strong>เหตุผล:</strong> {rejectReason || 'ไม่พบรายละเอียดเหตุผล'}
              </div>
              {latestRejectedLog?.created_at && (
                <div style={{ marginTop: '6px', fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>
                  ตีกลับเมื่อ: {formatDateTime(latestRejectedLog.created_at)} โดย {latestRejectedLog.user_full_name || latestRejectedLog.user_email || 'ไม่พบผู้ดำเนินการ'}
                </div>
              )}
            </div>
          )}
          <WorkflowProgressBar currentStatus={incident.status} steps={workflowSteps} />
        </div>

        {/* Main Grid */}
        <div className="incident-grid">
          {/* Left Column: Details */}
          <div style={{ minWidth: 0 }}>
            {/* Problem Info */}
            <div className="premium-card">
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }} />
                รายละเอียดข้อมูลปัญหา
              </h3>
              <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                {field('ระบบที่ได้รับผลกระทบ', 'affected_system', form.affected_system)}
                {field('ประเภท Incident', 'category', form.category)}
              </div>
              <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div className="field-label">ผู้แจ้ง / Requester</div>
                  <div className="field-value">{incident.reporter?.full_name || incident.reported_by || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ยังไม่มีข้อมูล —</span>}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div className="field-label">ผู้รับผิดชอบ / IT Assignee</div>
                  <div className="field-value">{incident.assigned_to || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ยังไม่มีข้อมูล —</span>}</div>
                </div>
              </div>
              {field('อาการที่พบ / รายละเอียด', 'description', form.description)}
            </div>

            {/* Resolution Info */}
            <div className="premium-card">
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '16px', background: '#10b981', borderRadius: '2px' }} />
                การแก้ไขปัญหา (Resolution)
              </h3>
              {field('Root Cause Analysis', 'root_cause', form.root_cause)}
              {field('วิธีการแก้ไข / Resolution', 'resolution', form.resolution)}
              {field('การป้องกัน / Corrective Action', 'corrective_action', form.corrective_action)}
            </div>
          </div>

          {/* Right Column: SLA & History */}
          <div style={{ minWidth: 0 }}>
            {/* SLA Widget */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>SLA Performance</h3>
              <SLAWidget 
                label="Response Time" 
                targetLabel={SLA_LABELS[incident.severity]?.response} 
                start={incident.created_at} 
                end={incident.acknowledged_at || incident.assigned_at || (incident.assigned_to ? incident.created_at : null)} 
                severity={incident.severity}
                type="response"
                settings={workingHours}
                holidays={holidays}
                exclusions={exclusions}
              />
              <SLAWidget 
                label="Resolution Time" 
                targetLabel={SLA_LABELS[incident.severity]?.resolve} 
                start={incident.acknowledged_at} 
                end={incident.resolved_at} 
                severity={incident.severity}
                type="resolve"
                settings={workingHours}
                holidays={holidays}
                exclusions={exclusions}
              />
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
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{log.action}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>โดย {log.user_full_name || log.user_email}</div>
                      
                      {/* Signatures in logs */}
                      {log.metadata?.signature_data && (
                        <div style={{ marginTop: '12px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>Digital Signature</div>
                          <img src={log.metadata.signature_data} style={{ height: '40px', objectFit: 'contain' }} alt="signature" />
                        </div>
                      )}
                      {log.metadata?.comment && (
                        <div style={{ marginTop: '8px', fontSize: '11px', fontStyle: 'italic', color: '#64748b', padding: '8px', borderLeft: '3px solid #e2e8f0' }}>
                          "{log.metadata.comment}"
                        </div>
                      )}
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

function ResolveDialog({ onCancel, onConfirm, loading, initialData = {}, severity = 'Medium', reporterName }) {
  const [data, setData] = useState({ 
    root_cause: initialData.root_cause || '', 
    resolution: initialData.resolution || '', 
    corrective_action: initialData.corrective_action || '' 
  })
  const [pin, setPin] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)
  
  const handleConfirm = async () => {
    if (severity === 'High' && !data.corrective_action?.trim()) {
      alert('⚠️ สำหรับเคสความรุนแรงสูง (High) จำเป็นต้องระบุ "การป้องกัน (Corrective Action)" ด้วยครับ')
      return
    }

    setVerifyingPin(true)
    
    const signatures = {
      it: { sig: null, name: 'IT Officer (System Log)' },
      reporter: { sig: null, name: 'Reporter (Face-to-face)' }
    }

    onConfirm({ ...data, signatures, reporter_pin: pin || null })
    setVerifyingPin(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '32px', padding: '40px', width: '100%', maxWidth: '700px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0 }}>🚀 ส่งงานแก้ไขปัญหา</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>ระบุรายละเอียดเพื่อบันทึกประวัติการแก้ไข</p>
          </div>
          <button onClick={onCancel} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Root Cause Analysis (สาเหตุ)</label>
            <textarea value={data.root_cause} onChange={e => setData({...data, root_cause: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '2px solid #f1f5f9', background: '#f8fafc', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} rows={2} placeholder="อธิบายสาเหตุที่แท้จริง..." />
          </div>
 
          <div>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>วิธีการแก้ไข (Resolution) *</label>
            <textarea value={data.resolution} onChange={e => setData({...data, resolution: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '2px solid #3b82f6', fontSize: '14px', fontFamily: 'inherit', background: '#fff', outline: 'none' }} rows={3} placeholder="อธิบายขั้นตอนการแก้ไข..." />
          </div>
 
          <div>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>การป้องกัน (Corrective Action) {severity === 'High' ? '*' : ''}</label>
            <textarea value={data.corrective_action} onChange={e => setData({...data, corrective_action: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '2px solid #f1f5f9', background: '#f8fafc', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} rows={2} placeholder="แนวทางป้องกัน..." />
            {severity === 'High' && <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', fontWeight: 700 }}>* จำเป็นสำหรับเคส High</div>}
          </div>
 
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '20px' }}>🤝</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>ยืนยันโดยผู้แจ้ง (Face-to-face)</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>ให้ผู้แจ้งใส่รหัส PIN เพื่อปิดงานทันที</div>
              </div>
            </div>
            
            <div style={{ maxWidth: '240px', margin: '0 auto' }}>
              <input 
                type="password" 
                maxLength={6} 
                value={pin} 
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} 
                placeholder="••••••" 
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 900, background: '#fff', outline: 'none' }} 
              />
            </div>
          </div>
        </div>
 
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 900, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button 
            onClick={handleConfirm} 
            disabled={loading || !data.resolution || verifyingPin} 
            style={{ 
              flex: 2, padding: '16px', borderRadius: '16px', border: 'none', 
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: '#fff', fontWeight: 900, fontSize: '15px', cursor: 'pointer', 
              opacity: loading || !data.resolution || verifyingPin ? 0.5 : 1, 
              fontFamily: 'inherit', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.2)'
            }}
          >
            {loading || verifyingPin ? 'กำลังบันทึก...' : '💾 บันทึกและส่งงาน'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReopenDialog({ onCancel, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginBottom: '8px' }}>🔓 Reopen Case</h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>ระบุเหตุผลที่ต้องการเปิดเคสนี้อีกครั้ง ลายเซ็นเดิมจะถูกลบออกทั้งหมด</p>
        
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="ระบุเหตุผล..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }} rows={4} />

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading || !reason.trim() ? 0.5 : 1, fontFamily: 'inherit' }}>ยืนยัน Reopen</button>
        </div>
      </div>
    </div>
  )
}

function AcknowledgeDialog({ onCancel, onConfirm, loading, currentSeverity, currentAssigneeId }) {
  const [severity, setSeverity] = useState(currentSeverity || 'Medium')
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId || '')
  const [staffs, setStaffs] = useState([])

  useEffect(() => {
    const fetchStaffs = async () => {
      const { data } = await supabase.from('user_profiles').select('id, full_name').in('role', ['admin', 'it_staff'])
      setStaffs(data || [])
    }
    fetchStaffs()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>⚡ รับเรื่อง (Acknowledge)</h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>กรุณายืนยันระดับความรุนแรงและผู้รับผิดชอบเพื่อเริ่มนับ SLA</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>ระดับความรุนแรง (Severity)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['Low', 'Medium', 'High'].map(s => (
                <button 
                  key={s}
                  onClick={() => setSeverity(s)}
                  style={{ 
                    padding: '12px', borderRadius: '12px', border: `2px solid ${severity === s ? SEVERITY_COLORS[s].color : '#e2e8f0'}`,
                    background: severity === s ? SEVERITY_COLORS[s].bg : '#fff',
                    color: severity === s ? SEVERITY_COLORS[s].color : '#64748b',
                    fontWeight: 800, cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>ผู้รับผิดชอบ (Assign To)</label>
            <select 
              value={assigneeId} 
              onChange={e => setAssigneeId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }}
            >
              <option value="">เลือกเจ้าหน้าที่...</option>
              {staffs.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button 
            onClick={() => onConfirm({ severity, assignee_id: assigneeId })} 
            disabled={loading || !assigneeId} 
            style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading || !assigneeId ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            {loading ? 'กำลังบันทึก...' : 'เริ่มรับเรื่อง'}
          </button>
        </div>
      </div>
    </div>
  )
}
