'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { calculateNetBusinessMinutes } from '@/lib/slaUtils'
import { recordLog, submitRequest, getDocumentWorkflowStatus, submitApprovalStep, resetDocumentWorkflow, rejectDocumentWorkflow } from '@/app/actions/workflow'
import { isSubstituteOf } from '@/lib/workflow'
import { WorkflowProgressBar } from '@/components/workflow/WorkflowProgressBar'
import { UnifiedApprovalModal } from '@/components/workflow/UnifiedApprovalModal'
import { WorkflowActionBar } from '@/components/workflow/WorkflowActionBar'

const SLA_LABELS = {
  High:   { response: 'ทันที (ภายใน 1 ชั่วโมง)', resolve: 'ภายใน 4 ชั่วโมง' },
  Medium: { response: 'ภายใน 2 ชั่วโมง',     resolve: 'ภายใน 8 ชั่วโมง' },
  Low:    { response: 'ภายใน 4 ชั่วโมง',     resolve: 'ภายใน 24 ชั่วโมง' }
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

  const targetMins = type === 'response' ? 
    (severity === 'High' ? 60 : severity === 'Medium' ? 120 : 240) : 
    (severity === 'High' ? 240 : severity === 'Medium' ? 480 : 1440)
  
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
      if (wfs) setWorkflowSteps(wfs)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Check if severity has changed to record a special log
    if (form.severity !== incident.severity) {
      await recordLog(
        id, 
        'incident', 
        'Updated', 
        `Severity changed from ${incident.severity} to ${form.severity}`, 
        currentUser.email
      )
    }

    const { reporter, ...updateData } = form
    const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
    if (error) alert(error.message)
    else {
      setEditing(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleResolveIncident = async (data) => {
    setSaving(true)
    const res = await submitRequest(id, 'incident', incident.severity, currentUser.email, data)
    if (res.success) {
      setShowResolveDialog(false)
      fetchData()
    } else alert(res.error)
    setSaving(false)
  }

  const handleApprove = async ({ pin, signatureData, comment }) => {
    setApprovalLoading(true)
    const currentStep = workflowSteps.find(s => s.status === 'pending')
    const res = await submitApprovalStep(id, 'incident', currentStep.id, signatureData, comment, pin)
    if (res.success) {
      setShowSignatureModal(false)
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

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
  if (!incident) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูลเคส</div>

  const isLocked = incident.status === 'Pending Approval' || incident.status === 'Closed'
  const isSuperUser = currentUser?.role === 'admin' || currentUser?.role === 'it_staff'
  const isAuditor = currentUser?.role === 'auditor'
  const currentStep = workflowSteps.find(s => s.status === 'pending')
  const canApprove = currentStep && (
    currentStep.approver_id === currentUser?.id || 
    (currentStep.role_required === currentUser?.role && !currentStep.approver_id) ||
    isSubstituteOf(currentUser?.role, currentStep.role_required)
  )

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
      
      {showResolveDialog && <ResolveDialog onCancel={() => setShowResolveDialog(false)} onConfirm={handleResolveIncident} loading={saving} />}
      {showReopenDialog && <ReopenDialog onCancel={() => setShowReopenDialog(false)} onConfirm={handleReopen} loading={saving} />}
      
      <UnifiedApprovalModal 
        isOpen={showSignatureModal} 
        onCancel={() => setShowSignatureModal(false)}
        onConfirm={handleApprove}
        approverName={currentStep?.role_required || currentUser?.full_name}
        userEmail={currentUser?.email}
        loading={approvalLoading}
      />

      <WorkflowActionBar 
        status={incident.status}
        canSubmit={!isLocked && incident.status !== 'Pending Approval' && !isAuditor}
        canApprove={canApprove}
        canReject={canApprove}
        canReopen={isSuperUser && isLocked}
        onSave={handleSave}
        onSubmit={() => setShowResolveDialog(true)}
        onApprove={() => setShowSignatureModal(true)}
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
                {field('ระบบที่ได้รับผลกระทบ', 'affected_system', incident.affected_system)}
                {field('ประเภท Incident', 'category', incident.category)}
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
              {field('อาการที่พบ / รายละเอียด', 'description', incident.description)}
            </div>

            {/* Resolution Info */}
            <div className="premium-card">
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '16px', background: '#10b981', borderRadius: '2px' }} />
                การแก้ไขปัญหา (Resolution)
              </h3>
              {field('Root Cause Analysis', 'root_cause', incident.root_cause)}
              {field('วิธีการแก้ไข / Resolution', 'resolution', incident.resolution)}
              {field('การป้องกัน / Corrective Action', 'corrective_action', incident.corrective_action)}
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

function ResolveDialog({ onCancel, onConfirm, loading }) {
  const [data, setData] = useState({ root_cause: '', resolution: '', corrective_action: '' })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>🚀 แก้ไขปัญหาเรียบร้อย</h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>กรุณาระบุรายละเอียดการแก้ไขเพื่อส่งขออนุมัติปิดเคส</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Root Cause Analysis</label>
            <textarea value={data.root_cause} onChange={e => setData({...data, root_cause: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }} rows={2} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>วิธีการแก้ไข (Resolution)</label>
            <textarea value={data.resolution} onChange={e => setData({...data, resolution: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }} rows={2} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>การป้องกัน (Corrective Action)</label>
            <textarea value={data.corrective_action} onChange={e => setData({...data, corrective_action: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }} rows={2} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button onClick={() => onConfirm(data)} disabled={loading || !data.resolution} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading || !data.resolution ? 0.5 : 1, fontFamily: 'inherit' }}>ยืนยันส่งงาน</button>
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