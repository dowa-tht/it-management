'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import SignaturePad from 'react-signature-canvas'
import { verifyEmployeePIN } from '@/app/actions/users'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { calculateIncidentSlaSnapshot } from '@/lib/slaUtils'
import { getPotentialWorkflowSteps, recordLog, submitRequest, getDocumentWorkflowStatus, submitApprovalStep, resetDocumentWorkflow, rejectDocumentWorkflow, syncDynamicWorkflowApprovers, diagnoseApprovalPin, cancelDocument, requestIncidentCancelOTP, requestIncidentApprovalOTP, verifyIncidentApprovalOTP, diagnoseIncidentApprovalOTP } from '@/app/actions/workflow'
import { acknowledgeIncident, createIncidentExclusionManual, closeIncidentExclusionManual, getIncidentMasterData, requestIncidentReporterOtp, verifyIncidentReporterOtp, resendIncidentFollowupLink, validateExternalReporterEmail } from '@/app/actions/incidents'
import { isSubstituteOf } from '@/lib/workflow'
import { WorkflowProgressBar } from '@/components/workflow/WorkflowProgressBar'
import { UnifiedApprovalModal } from '@/components/workflow/UnifiedApprovalModal'
import { WorkflowActionBar } from '@/components/workflow/WorkflowActionBar'
import { WORKFLOW_DOC_REGISTRY } from '@/lib/workflowRegistry'
import { useWorkflowNotification } from '@/components/workflow/WorkflowNotification'
import { UserAutocomplete } from '../components/UserAutocomplete'
import { deriveIncidentCancelVerificationPolicy } from '@/lib/incidentCancelVerificationPolicy'
import { getCurrentActorProfile } from '@/app/actions/user'

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

function formatDdMmmYy24h(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.toLocaleString('en-GB', { day: '2-digit', timeZone: 'Asia/Bangkok' })
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Bangkok' })
  const year = d.toLocaleString('en-GB', { year: '2-digit', timeZone: 'Asia/Bangkok' })
  const hours = d.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' })
  const mins = d.toLocaleString('en-GB', { minute: '2-digit', timeZone: 'Asia/Bangkok' })
  return `${day} / ${month} / ${year} ${hours}:${mins}`
}

function formatLocalDateTimeValue(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return formatDdMmmYy24h(d)
}

function parseDdMmmYy24h(input) {
  const raw = (input || '').trim().toLowerCase()
  const m = raw.match(/^(\d{1,2})\s*\/\s*([a-z]{3})\s*\/\s*(\d{2})\s+(\d{2}):(\d{2})$/)
  if (!m) return null

  const [, dd, mon, yy, hh, mm] = m
  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const month = monthMap[mon]
  if (month === undefined) return null

  const dayNum = Number(dd)
  const yearNum = 2000 + Number(yy)
  const hourNum = Number(hh)
  const minNum = Number(mm)
  if (dayNum < 1 || dayNum > 31 || hourNum < 0 || hourNum > 23 || minNum < 0 || minNum > 59) return null

  const date = new Date(yearNum, month, dayNum, hourNum, minNum, 0, 0)
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== month ||
    date.getDate() !== dayNum ||
    date.getHours() !== hourNum ||
    date.getMinutes() !== minNum
  ) return null
  return date
}

function splitIsoLocal(value) {
  if (!value) return { date: '', time: '' }
  const raw = String(value)
  const [d, t = ''] = raw.split('T')
  return { date: d || '', time: t.slice(0, 5) || '' }
}

function formatDateOnlyDdMmmYy(dateValue) {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleString('en-GB', { day: '2-digit', timeZone: 'Asia/Bangkok' })
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Bangkok' })
  const year = d.toLocaleString('en-GB', { year: '2-digit', timeZone: 'Asia/Bangkok' })
  return `${day} / ${month} / ${year}`
}

function buildIsoLocal(date, time) {
  if (!date) return ''
  return `${date}T${time || '00:00'}`
}

function localDateTimeToIso(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function normalizeTime24h(input) {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return ''

  const ampm = raw.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)$/)
  if (ampm) {
    let hh = Number(ampm[1])
    const mm = Number(ampm[2])
    const ap = ampm[3]
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return ''
    if (ap === 'am') hh = hh === 12 ? 0 : hh
    if (ap === 'pm') hh = hh === 12 ? 12 : hh + 12
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const pure24 = raw.match(/^(\d{1,2})\s*:\s*(\d{2})$/)
  if (!pure24) return ''
  const hh = Number(pure24[1])
  const mm = Number(pure24[2])
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return ''
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function formatTimeInputProgressive(input) {
  const raw = String(input || '')
  const hasColon = raw.includes(':')
  if (hasColon) {
    return raw.replace(/[^\d:]/g, '').slice(0, 5)
  }
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function SLAWidget({ label, targetLabel, snapshot, type }) {
  const mins = type === 'response' ? snapshot?.responseMin : snapshot?.resolveMin
  const targetMins = type === 'response' ? snapshot?.responseLimit : snapshot?.resolveLimit
  const status = type === 'response' ? snapshot?.responseStatus : snapshot?.resolutionStatus

  const s = status === 'N/A'
    ? { icon: 'ℹ️', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', text: 'N/A (ยังไม่เข้าเงื่อนไขประเมิน)' }
    : status === 'PASS'
      ? { icon: '✅', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', text: `Done OK (${formatElapsed(mins)})` }
      : { icon: '❌', color: '#dc2626', bg: '#fff1f2', border: '#fecaca', text: `Over SLA (${formatElapsed(mins)})` }

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
      {targetMins !== null && targetMins !== undefined ? (
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: 700 }}>
          Target: {formatElapsed(targetMins)}
        </div>
      ) : null}
    </div>
  )
}

export default function IncidentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const followupToken = String(searchParams.get('followup') || '').trim()
  const isExternalFollowupMode = Boolean(followupToken)
  const [incident, setIncident] = useState(null)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [logs, setLogs] = useState([])
  const [workflowSteps, setWorkflowSteps] = useState([])
  const [isSubstitute, setIsSubstitute] = useState(false)

  const { NotificationComponent, showToast, showModal } = useWorkflowNotification()
  
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [isRemoteApprovalMode, setIsRemoteApprovalMode] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelPin, setCancelPin] = useState('')
  const [cancelOtp, setCancelOtp] = useState('')
  const [cancelStep, setCancelStep] = useState('reason') // 'reason' | 'verify' | 'otp'
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)

  const [workingHours, setWorkingHours] = useState(null)
  const [holidays, setHoneydays] = useState([])
  const [exclusions, setExclusions] = useState([])
  const [categories, setCategories] = useState([])
  const [systems, setSystems] = useState([])
  const [exclusionReasons, setExclusionReasons] = useState([])
  const [manualExclusion, setManualExclusion] = useState({ reason_id: '', start_time: '', end_time: '', notes: '' })
  const [manualExclusionLoading, setManualExclusionLoading] = useState(false)
  const [reporterOtpRequested, setReporterOtpRequested] = useState(false)
  const [reporterOtpLoading, setReporterOtpLoading] = useState(false)
  const [reporterOtpVerifying, setReporterOtpVerifying] = useState(false)
  const [reporterOtpCode, setReporterOtpCode] = useState('')
  const [reporterOtpVerifiedEmail, setReporterOtpVerifiedEmail] = useState('')
  const [showReporterModal, setShowReporterModal] = useState(false)
  const [reporterDraft, setReporterDraft] = useState({ reported_by: '', reporter_email: '', reported_by_id: null })
  const [reporterMode, setReporterMode] = useState('existing')
  const [resendFollowupLoading, setResendFollowupLoading] = useState(false)
  const [followupMeta, setFollowupMeta] = useState(null)
  const startDatePickerRef = useRef(null)
  const endDatePickerRef = useRef(null)
  const exclusionLowerBoundIso = incident?.acknowledged_at || incident?.assigned_at || incident?.created_at || null
  const exclusionLowerBound = exclusionLowerBoundIso ? new Date(exclusionLowerBoundIso) : null
  const nowBound = new Date()
  const nowDateStr = nowBound.toISOString().slice(0, 10)
  const activeManualExclusion = exclusions.find((ex) => ex?.start_time && !ex?.end_time) || null

  useEffect(() => {
    const init = async () => {
      if (!isExternalFollowupMode) {
        const actor = await getCurrentActorProfile()
        if (actor) setCurrentUser(actor)
      }
      fetchData({ followupToken: isExternalFollowupMode ? followupToken : null })
    }
    init()
  }, [id, isExternalFollowupMode, followupToken])

  // Resolve isSubstituteOf แบบ async — รันเมื่อ currentUser หรือ workflowSteps เปลี่ยน
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

  async function fetchData(opts = {}) {
    setLoading(true)
    try {
      if (opts.followupToken) {
        const res = await fetch(`/api/incidents/followup?token=${encodeURIComponent(opts.followupToken)}&incidentId=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (!res.ok) {
          setIncident(null)
          setWorkflowSteps([])
          setLogs([])
          showToast({ message: data?.error || 'ไม่สามารถเปิดลิงก์ติดตามเคสได้', type: 'error' })
          setLoading(false)
          return
        }

        setIncident(data.incident || null)
        setForm(data.incident || {})
        setWorkflowSteps(data.workflowSteps || [])
        setFollowupMeta(data.token || null)
        setLogs([])
        setLoading(false)
        return
      }

      const [
        { data: inc }, 
        { data: lgs }, 
        { data: settings }, 
        { data: hols }, 
        { data: excl },
        masterRes
      ] = await Promise.all([
        supabase.from('incidents').select('*, reporter:user_profiles!reported_by_id(full_name, email), creator:user_profiles!created_by_id(full_name, email)').eq('id', id).single(),
        supabase.from('system_audit_logs').select('*').eq('doc_id', id).order('created_at', { ascending: false }),
        supabase.from('system_settings').select('*').eq('key', 'working_hours').single(),
        supabase.from('holidays').select('holiday_date'),
        supabase.from('incident_exclusions').select('*').eq('incident_id', id),
        getIncidentMasterData()
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
      if (hols) setHoneydays(hols.map(h => h.holiday_date))
      if (excl) setExclusions(excl)
      if (masterRes?.success && masterRes.data) {
        setCategories(masterRes.data.categories || [])
        setSystems(masterRes.data.systems || [])
        setExclusionReasons(masterRes.data.exclusionReasons || [])
      }

      const { data: wfs } = await getDocumentWorkflowStatus(id)
      
      const enrichSteps = (steps) => {
        return steps?.map((s) => {
          // Resolve dynamic person only for dynamic-role steps.
          if (!s.user_profiles && s.role_required === 'reporter' && inc.reporter) {
            return { ...s, user_profiles: { ...inc.reporter } }
          }
          if (!s.user_profiles && s.role_required === 'creator' && inc.creator) {
            return { ...s, user_profiles: { ...inc.creator } }
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
    const nextReporterEmail = String(form.reporter_email || '').trim().toLowerCase()
    const oldReporterEmail = String(incident.reporter_email || '').trim().toLowerCase()
    const reporterEmailChanged = nextReporterEmail !== oldReporterEmail

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

    const { reporter, creator, reporter_otp_verified_email, reporter_otp_verified_at, ...updateData } = form
    if (reporterEmailChanged && !updateData.reported_by_id && reporterOtpVerifiedEmail !== nextReporterEmail) {
      alert('กรุณายืนยัน OTP ของอีเมลผู้แจ้งใหม่ก่อนบันทึก')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
    if (error) alert(error.message)
    else {
      if (reporterEmailChanged) {
        await recordLog(
          id,
          'incident',
          'Reporter Email Changed',
          `เปลี่ยนอีเมลผู้แจ้งจาก ${oldReporterEmail || '-'} เป็น ${nextReporterEmail}`,
          currentUser.email
        )
      }
      if (updateData.reported_by_id !== incident.reported_by_id && incident.workflow_status === 'pending') {
        const syncRes = await syncDynamicWorkflowApprovers(id, 'incident')
        if (!syncRes.success) {
          alert('บันทึกข้อมูลแล้ว แต่ไม่สามารถ Sync ผู้อนุมัติ Reporter ได้: ' + syncRes.error)
        }
      }
      setEditing(false)
      setReporterOtpRequested(false)
      setReporterOtpCode('')
      setReporterOtpVerifiedEmail('')
      fetchData()
    }
    setSaving(false)
  }

  const handleRequestReporterEmailOtp = async () => {
    const reporterName = String(reporterDraft.reported_by || '').trim()
    const reporterEmail = String(reporterDraft.reporter_email || '').trim().toLowerCase()
    if (!reporterName || !reporterEmail) {
      alert('กรุณาระบุชื่อและอีเมลผู้แจ้งให้ครบก่อนขอ OTP')
      return
    }
    const checkRes = await validateExternalReporterEmail({ reporter_email: reporterEmail })
    if (!checkRes.success) {
      alert(checkRes.error || 'ไม่สามารถตรวจสอบอีเมลผู้แจ้งได้')
      return
    }
    setReporterOtpLoading(true)
    const res = await requestIncidentReporterOtp({ reported_by: reporterName, reporter_email: reporterEmail })
    setReporterOtpLoading(false)
    if (!res.success) {
      alert(res.error || 'ไม่สามารถส่ง OTP ได้')
      return
    }
    setReporterOtpRequested(true)
    showToast({ message: `ส่ง OTP ไปที่ ${res.maskedEmail || reporterEmail} แล้ว`, type: 'success' })
  }

  const handleVerifyReporterEmailOtp = async () => {
    const reporterName = String(reporterDraft.reported_by || '').trim()
    const reporterEmail = String(reporterDraft.reporter_email || '').trim().toLowerCase()
    if (!reporterOtpCode) {
      alert('กรุณากรอกรหัส OTP')
      return
    }
    setReporterOtpVerifying(true)
    const res = await verifyIncidentReporterOtp({ reported_by: reporterName, reporter_email: reporterEmail, otp: reporterOtpCode })
    setReporterOtpVerifying(false)
    if (!res.success) {
      alert(res.error || 'ยืนยัน OTP ไม่สำเร็จ')
      return
    }
    setReporterOtpVerifiedEmail(res.verifiedReporterEmail || reporterEmail)
    showToast({ message: 'ยืนยัน OTP อีเมลผู้แจ้งเรียบร้อย', type: 'success' })
  }

  const openReporterModal = () => {
    const nextDraft = {
      reported_by: form.reported_by || '',
      reporter_email: form.reporter_email || '',
      reported_by_id: form.reported_by_id || null
    }
    setReporterDraft(nextDraft)
    setReporterMode(nextDraft.reported_by_id ? 'existing' : 'external')
    setReporterOtpCode('')
    setReporterOtpRequested(false)
    setReporterOtpVerifiedEmail(String(form.reporter_otp_verified_email || '').trim().toLowerCase())
    setShowReporterModal(true)
  }

  const closeReporterModal = (options = {}) => {
    const { keepVerifiedEmail = false } = options
    setShowReporterModal(false)
    setReporterOtpCode('')
    setReporterOtpRequested(false)
    if (!keepVerifiedEmail) {
      setReporterOtpVerifiedEmail(String(form.reporter_otp_verified_email || '').trim().toLowerCase())
    }
  }

  const applyReporterDraft = async () => {
    const nextName = String(reporterDraft.reported_by || '').trim()
    const nextEmail = String(reporterDraft.reporter_email || '').trim().toLowerCase()
    if (!nextName) {
      alert('กรุณาระบุชื่อผู้แจ้ง')
      return
    }
    if (reporterMode === 'external') {
      if (!nextEmail) {
        alert('กรุณาระบุอีเมลผู้แจ้งภายนอก')
        return
      }
      const checkRes = await validateExternalReporterEmail({ reporter_email: nextEmail })
      if (!checkRes.success) {
        alert(checkRes.error || 'ไม่สามารถตรวจสอบอีเมลผู้แจ้งได้')
        return
      }
      if (reporterOtpVerifiedEmail !== nextEmail) {
        alert('กรุณายืนยัน OTP ของอีเมลผู้แจ้งก่อนบันทึก')
        return
      }
      setForm({
        ...form,
        reported_by: nextName,
        reporter_email: nextEmail,
        reported_by_id: null,
        reporter_otp_verified_email: nextEmail,
        reporter_otp_verified_at: new Date().toISOString()
      })
    } else {
      setForm({
        ...form,
        reported_by: nextName,
        reporter_email: nextEmail,
        reported_by_id: reporterDraft.reported_by_id || null,
        reporter_otp_verified_email: '',
        reporter_otp_verified_at: null
      })
      setReporterOtpVerifiedEmail('')
    }
    // Keep freshly verified OTP email from modal state.
    // setForm is async; re-syncing from stale form here can clear verification.
    closeReporterModal({ keepVerifiedEmail: true })
  }

  const handleAddManualExclusion = async () => {
    if (!manualExclusion.reason_id || !manualExclusion.start_time) {
      showToast({ message: 'กรุณาเลือกเหตุผลและเวลาเริ่มต้น', type: 'error' })
      return
    }
    const parsedStart = localDateTimeToIso(manualExclusion.start_time)
    if (!parsedStart) {
      showToast({ message: 'กรุณาเลือกวันและเวลาเริ่มต้นให้ครบ', type: 'error' })
      return
    }
    const parsedEnd = manualExclusion.end_time ? localDateTimeToIso(manualExclusion.end_time) : null
    if (manualExclusion.end_time && !parsedEnd) {
      showToast({ message: 'กรุณาเลือกวันและเวลาสิ้นสุดให้ครบ', type: 'error' })
      return
    }
    const startDt = new Date(parsedStart)
    const endDt = parsedEnd ? new Date(parsedEnd) : null
    if (Number.isNaN(startDt.getTime()) || (endDt && Number.isNaN(endDt.getTime()))) {
      showToast({ message: 'รูปแบบวันเวลาไม่ถูกต้อง', type: 'error' })
      return
    }
    if (startDt > nowBound) {
      showToast({ message: 'เวลาเริ่มต้นต้องไม่เป็นเวลาในอนาคต', type: 'error' })
      return
    }
    if (endDt && endDt > nowBound) {
      showToast({ message: 'เวลาสิ้นสุดต้องไม่เป็นเวลาในอนาคต', type: 'error' })
      return
    }
    if (exclusionLowerBound && startDt < exclusionLowerBound) {
      showToast({ message: `เวลาเริ่มต้นต้องไม่ก่อน ${formatDdMmmYy24h(exclusionLowerBoundIso)}`, type: 'error' })
      return
    }
    if (endDt && exclusionLowerBound && endDt < exclusionLowerBound) {
      showToast({ message: `เวลาสิ้นสุดต้องไม่ก่อน ${formatDdMmmYy24h(exclusionLowerBoundIso)}`, type: 'error' })
      return
    }
    const overlapFound = exclusions.some((ex) => {
      if (!ex?.start_time) return false
      const exStart = new Date(ex.start_time)
      const exEnd = ex.end_time ? new Date(ex.end_time) : nowBound
      if (Number.isNaN(exStart.getTime()) || Number.isNaN(exEnd.getTime())) return false
      const candidateEnd = endDt || nowBound
      return startDt < exEnd && candidateEnd > exStart
    })
    if (overlapFound) {
      showToast({ message: 'ช่วงเวลาซ้อนกับ SLA Exclusion เดิม กรุณาแก้ช่วงเวลาใหม่', type: 'error' })
      return
    }
    setManualExclusionLoading(true)
    try {
      const res = await createIncidentExclusionManual({
        incident_id: id,
        reason_id: manualExclusion.reason_id,
        start_time: parsedStart,
        end_time: parsedEnd ? parsedEnd : null,
        notes: manualExclusion.notes,
      })
      if (!res.success) {
        showToast({ message: res.error || 'ไม่สามารถเพิ่ม Exclusion ได้', type: 'error' })
      } else {
        setManualExclusion({ reason_id: '', start_time: '', end_time: '', notes: '' })
        await fetchData()
        showToast({ message: 'เพิ่ม SLA Exclusion แล้ว', type: 'success' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setManualExclusionLoading(false)
  }

  const handleQuickStartManualExclusion = async () => {
    if (!manualExclusion.reason_id) {
      showToast({ message: 'กรุณาเลือกเหตุผลก่อนเริ่มหยุด SLA', type: 'error' })
      return
    }
    if (activeManualExclusion) {
      showToast({ message: 'มีช่วง SLA Exclusion ที่กำลังเปิดอยู่แล้ว', type: 'error' })
      return
    }
    setManualExclusionLoading(true)
    try {
      const nowIso = new Date().toISOString()
      const res = await createIncidentExclusionManual({
        incident_id: id,
        reason_id: manualExclusion.reason_id,
        start_time: nowIso,
        end_time: null,
        notes: manualExclusion.notes,
      })
      if (!res.success) {
        showToast({ message: res.error || 'ไม่สามารถเริ่มหยุด SLA ได้', type: 'error' })
      } else {
        setManualExclusion(prev => ({ ...prev, start_time: '', end_time: '' }))
        await fetchData()
        showToast({ message: 'เริ่มหยุด SLA แล้ว (เริ่มนับช่วง Exclusion ทันที)', type: 'success' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setManualExclusionLoading(false)
  }

  const handleQuickStopManualExclusion = async () => {
    if (!activeManualExclusion) {
      showToast({ message: 'ยังไม่มีช่วง SLA Exclusion ที่กำลังเปิดอยู่', type: 'error' })
      return
    }
    await handleCloseManualExclusion(activeManualExclusion.id)
  }

  const handleCloseManualExclusion = async (exclusionId) => {
    setManualExclusionLoading(true)
    try {
      const res = await closeIncidentExclusionManual({
        exclusion_id: exclusionId,
        end_time: new Date().toISOString(),
      })
      if (!res.success) {
        showToast({ message: res.error || 'ไม่สามารถปิด Exclusion ได้', type: 'error' })
      } else {
        await fetchData()
        showToast({ message: 'ปิด SLA Exclusion แล้ว', type: 'success' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setManualExclusionLoading(false)
  }

  const handleResolveIncident = async (resolveData) => {
    setSaving(true)
    const { signatures, ...updateFields } = resolveData

    const { error: updateErr } = await supabase.from('incidents').update({
      ...updateFields,
      resolved_at: new Date().toISOString(),
      resolved_by: currentUser.id
    }).eq('id', id)

    if (updateErr) {
      showToast({ message: 'ไม่สามารถบันทึกข้อมูลการแก้ไขได้: ' + updateErr.message, type: 'error' })
      setSaving(false)
      return
    }

    const signaturesWithIds = {
      ...signatures,
      it: { ...signatures.it, userId: currentUser.id },
      reporter: { ...signatures.reporter, userId: incident.reported_by_id }
    }

    try {
      const res = await submitRequest(id, 'incident', incident.severity, currentUser.email, signaturesWithIds, null)
      if (res.success) {
        setShowResolveDialog(false)
        await fetchData()
        router.refresh()
        showModal({
          title: 'ส่งงานแก้ไขปัญหาสำเร็จ! 🎉',
          message: 'เคส Incident นี้ได้รับการส่งขออนุมัติปิดงานเรียบร้อยแล้ว',
          type: 'success'
        })
      } else {
        showToast({ message: 'เกิดข้อผิดพลาดในการส่งอนุมัติ: ' + res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setSaving(false)
  }

  const handleApprove = async ({ pin, otp, signatureData, comment }) => {
    setApprovalLoading(true)
    try {
      let currentStep = workflowSteps.find(s => s.status === 'pending')
      if (isRemoteApprovalMode && currentStep?.role_required === 'reporter' && !currentStep.approver_id && incident?.reported_by_id) {
        currentStep = { ...currentStep, approver_id: incident.reported_by_id }
      }
      const overrideApproverId = isRemoteApprovalMode
        ? (currentStep?.approver_id || incident?.reported_by_id || null)
        : (currentStep?.approver_id || null)
      const res = await submitApprovalStep(id, 'incident', currentStep.id, signatureData, comment, pin, overrideApproverId, otp || null)
      if (res.success) {
        setShowSignatureModal(false)
        setIsRemoteApprovalMode(false)
        showModal({
          title: 'อนุมัติสำเร็จ',
          message: `อนุมัติเอกสารเลขที่ ${incident?.case_number || id} แล้ว`,
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

  const handleRejectIncident = async () => {
    const reason = prompt('กรุณาระบุเหตุผลในการตีกลับ:')
    if (!reason) return
    try {
      const res = await rejectDocumentWorkflow(id, 'incident', reason)
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

  const handleReopen = async (reason) => {
    setSaving(true)
    try {
      const res = await resetDocumentWorkflow(id, 'incident', reason)
      if (res.success) {
        setShowReopenDialog(false)
        await fetchData()
        router.refresh()
        showToast({ message: '🔓 เปิดเคสใหม่เรียบร้อย', type: 'success' })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setSaving(false)
  }

  const handleAcknowledge = async (acknowledgeData) => {
    setSaving(true)
    try {
      const res = await acknowledgeIncident(id, acknowledgeData.severity, acknowledgeData.assignee_id)
      if (res.success) {
        setShowAcknowledgeDialog(false)
        await fetchData()
        router.refresh()
        showToast({ message: '📌 รับเรื่องเรียบร้อยแล้ว', type: 'success' })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setSaving(false)
  }

  // Cancel Incident Handlers
  const handleCancel = async () => {
    setShowCancelDialog(true)
    setCancelStep('reason')
    setCancelReason('')
    setCancelPin('')
    setCancelOtp('')
  }

  const handleRequestCancelOTP = async () => {
    const policy = deriveIncidentCancelVerificationPolicy({
      actorRole: currentUser?.role,
      actorId: currentUser?.id,
      incident
    })
    if (!policy.allowOtp) {
      showToast({ message: 'สิทธิ์นี้ไม่รองรับการยืนยันด้วย OTP', type: 'warning' })
      return
    }
    setIsRequestingOtp(true)
    try {
      const res = await requestIncidentCancelOTP(id)
      if (res.success) {
        setCancelStep('otp')
        showToast({ message: 'ส่ง OTP ไปยังอีเมลผู้แจ้งแล้ว', type: 'success' })
      } else {
        showToast({ message: res.error, type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setIsRequestingOtp(false)
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      showToast({ message: 'กรุณาระบุเหตุผลในการยกเลิก', type: 'error' })
      return
    }

    // If not verified yet, go to verification step
    if (cancelStep === 'reason') {
      const policy = deriveIncidentCancelVerificationPolicy({
        actorRole: currentUser?.role,
        actorId: currentUser?.id,
        incident
      })
      setCancelStep(policy.allowPin ? 'verify' : 'otp')
      return
    }

    // Verify and cancel
    setCancelLoading(true)
    try {
      const verification = {}
      if (cancelPin) verification.pin = cancelPin
      if (cancelOtp) verification.otp = cancelOtp

      const res = await cancelDocument(id, 'incident', cancelReason, verification)
      if (res.success) {
        setShowCancelDialog(false)
        setCancelReason('')
        setCancelPin('')
        setCancelOtp('')
        setCancelStep('reason')
        await fetchData()
        showModal({
          title: 'ยกเลิกเคสสำเร็จ',
          message: `เคส ${res.docNo} ถูกยกเลิกเรียบร้อยแล้ว`,
          type: 'success'
        })
      } else {
        if (res.requiresVerification) {
          setCancelStep('verify')
          showToast({ message: 'กรุณายืนยันตัวตนด้วย PIN หรือ OTP', type: 'warning' })
        } else {
          showToast({ message: res.error, type: 'error' })
        }
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setCancelLoading(false)
  }

  // Cancel Dialog JSX
  const renderCancelDialog = () => (
    (() => {
      const cancelPolicy = deriveIncidentCancelVerificationPolicy({
        actorRole: currentUser?.role,
        actorId: currentUser?.id,
        incident
      })
      const canUsePin = cancelPolicy.allowPin
      const canUseOtp = cancelPolicy.allowOtp
      const isPinOnly = cancelPolicy.requirePinOnly
      return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 450 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>🚫 ยกเลิกเคส</div>

        {cancelStep === 'reason' && (
          <>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              คุณกำลังจะยกเลิกเคส <strong>{incident?.case_number}</strong><br/>
              เมื่อยกเลิกแล้วจะไม่สามารถแก้ไขหรือดำเนินการต่อได้อีก
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
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); setCancelStep('reason') }}
                style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, fontSize: 13, background: cancelReason.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 600 }}
              >
                ถัดไป
              </button>
            </div>
          </>
        )}

        {(cancelStep === 'verify' || cancelStep === 'otp') && (
          <>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              กรุณายืนยันตัวตน <strong>{cancelPolicy.actorLabel || 'ผู้แจ้งเหตุ (Reporter)'}</strong> เพื่อยกเลิกเคส<br/>
              <span style={{ fontSize: 12, color: '#dc2626' }}>
                {cancelPolicy.hint || '* ต้องการ PIN หรือ OTP จากผู้แจ้งเท่านั้น'}
              </span>
            </div>

            {cancelStep === 'verify' && canUsePin && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  {cancelPolicy.pinLabel || 'PIN ของผู้แจ้ง'}
                </label>
                <input
                  type="password"
                  value={cancelPin}
                  onChange={e => setCancelPin(e.target.value)}
                  placeholder="กรอก PIN"
                  maxLength={6}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                />
                {canUseOtp && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                    หรือ <button onClick={handleRequestCancelOTP} disabled={isRequestingOtp} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, padding: 0 }}>{isRequestingOtp ? 'กำลังส่ง...' : 'ขอรับ OTP ทางอีเมล'}</button>
                  </div>
                )}
              </div>
            )}

            {canUseOtp && cancelStep === 'otp' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>OTP ที่ได้รับทางอีเมล</label>
                <input
                  type="text"
                  value={cancelOtp}
                  onChange={e => setCancelOtp(e.target.value)}
                  placeholder="กรอก OTP"
                  maxLength={8}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                />
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                  {canUsePin && (
                    <>
                      <button onClick={() => setCancelStep('verify')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, padding: 0 }}>← กลับไปใช้ PIN</button>
                      {' | '}
                    </>
                  )}
                  <button onClick={handleRequestCancelOTP} disabled={isRequestingOtp} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, padding: 0 }}>{isRequestingOtp ? 'กำลังส่ง...' : 'ส่ง OTP อีกครั้ง'}</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); setCancelPin(''); setCancelOtp(''); setCancelStep('reason') }}
                disabled={cancelLoading}
                style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading || (isPinOnly ? !cancelPin : (!cancelPin && !cancelOtp))}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, fontSize: 13, background: (isPinOnly ? cancelPin : (cancelPin || cancelOtp)) ? '#dc2626' : '#fca5a5', color: '#fff', cursor: (isPinOnly ? cancelPin : (cancelPin || cancelOtp)) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 600 }}
              >
                {cancelLoading ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
      )
    })()
  )

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
  if (!incident) return <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูลเคส</div>

  const normalizedRole = String(currentUser?.role || '').toLowerCase() === 'administrator' ? 'admin' : currentUser?.role
  const isAdminRole = normalizedRole === 'admin'
  const hasFullAccess = !isExternalFollowupMode && (isAdminRole || normalizedRole === 'it_staff')
  const isLocked = incident.status === 'Pending Approval' || incident.status === 'Closed' || (incident.status === 'In Progress' && !hasFullAccess)
  const isAuditor = currentUser?.role === 'auditor'
  const currentStep = workflowSteps.find(s => s.status === 'pending')
  const isCreator = currentUser?.id === incident?.created_by_id
  const isReporter = currentUser?.id === incident?.reported_by_id
  const latestRejectedStep = workflowSteps.find(s => s.status === 'rejected')
  const latestRejectedLog = logs.find(log => log.action === 'Rejected')
  const latestSubmittedLog = logs.find(log => log.action === 'Submitted')
  const rejectReason = latestRejectedStep?.comment?.replace(/^Rejected:\s*/i, '') || latestRejectedLog?.details?.split('เหตุผล:').pop()?.trim() || ''
  const wasRejected = Boolean(latestRejectedStep || latestRejectedLog)
  const canApprove = !!(currentStep && (
    currentStep.approver_id === currentUser?.id ||
    (!currentStep.approver_id && currentStep.role_required === currentUser?.role) ||
    isSubstitute ||
    (currentStep.role_required === 'reporter' && isReporter)
  ))
  const canReject = !!(
    incident.status === 'Pending Approval' &&
    (canApprove || isAdminRole)
  )

  const canEditDetails = !isExternalFollowupMode && !isLocked && (hasFullAccess || incident.reported_by_id === currentUser?.id)
  const canSubmitForApproval = !isExternalFollowupMode && incident.status === 'In Progress' && hasFullAccess
  // canRemoteApprove (Phase C): จำกัดเฉพาะ admin / it_staff ตาม policy ใหม่
  const canRemoteApprove = !!(
    incident.status === 'Pending Approval' &&
    !canApprove &&
    ['admin', 'it_staff'].includes(normalizedRole)
  )
  const isExternalReporterStep = Boolean(
    isRemoteApprovalMode &&
    currentStep?.role_required === 'reporter' &&
    !incident?.reported_by_id &&
    incident?.reporter_email
  )
  const canAcknowledgeIncident = !isExternalFollowupMode && incident.status === 'Open' && ['admin', 'it_staff'].includes(normalizedRole)
  const acknowledgeActionLabel = isAdminRole ? '📌 มอบหมายงาน (Dispatch)' : '⚡ รับเรื่อง (Accept)'
  const isExternalReporterCase = Boolean(!incident?.reported_by_id && incident?.reporter_email)
  const canResendFollowupLink = Boolean(!isExternalFollowupMode && ['admin', 'it_staff'].includes(currentUser?.role) && isExternalReporterCase)

  const handleResendFollowupLink = async () => {
    setResendFollowupLoading(true)
    try {
      const res = await resendIncidentFollowupLink(id)
      if (res?.success) {
        showToast({ message: `ส่งลิงก์ใหม่ไปที่ ${res.maskedEmail || incident.reporter_email} แล้ว`, type: 'success' })
      } else {
        showToast({ message: res?.error || 'ไม่สามารถส่งลิงก์ติดตามเคสใหม่ได้', type: 'error' })
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    }
    setResendFollowupLoading(false)
  }

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

  const slaSnapshot = calculateIncidentSlaSnapshot(incident, {
    workingHours: workingHours || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] },
    holidays,
    exclusions,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '120px' }}>
      <PageStyles />
      
      {showAcknowledgeDialog && (
        <AcknowledgeDialog 
          onCancel={() => setShowAcknowledgeDialog(false)} 
          onConfirm={handleAcknowledge} 
          loading={saving} 
          currentSeverity={incident.severity}
          currentUser={currentUser}
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
      {showCancelDialog && renderCancelDialog()}
      {showReporterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.45)', display: 'grid', placeItems: 'center', zIndex: 70, padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 16, border: '1px solid #dbe4ef', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.28)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>แก้ไขผู้แจ้งปัญหา</h3>
              <button type="button" onClick={closeReporterModal} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>ปิด</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setReporterMode('existing')
                  setReporterOtpCode('')
                  setReporterOtpRequested(false)
                  setReporterOtpVerifiedEmail('')
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: `1px solid ${reporterMode === 'existing' ? '#2563eb' : '#cbd5e1'}`,
                  background: reporterMode === 'existing' ? '#dbeafe' : '#fff',
                  color: reporterMode === 'existing' ? '#1e3a8a' : '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                เลือกจากในระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setReporterMode('external')
                  setReporterDraft({
                    ...reporterDraft,
                    reported_by_id: null
                  })
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: `1px solid ${reporterMode === 'external' ? '#2563eb' : '#cbd5e1'}`,
                  background: reporterMode === 'external' ? '#dbeafe' : '#fff',
                  color: reporterMode === 'external' ? '#1e3a8a' : '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                เพิ่มผู้แจ้งภายนอก
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ชื่อผู้แจ้ง / Reported By</label>
                {reporterMode === 'existing' ? (
                  <UserAutocomplete
                    value={{ id: reporterDraft.reported_by_id, full_name: reporterDraft.reported_by, email: reporterDraft.reporter_email }}
                    onChange={(u) => setReporterDraft({ reported_by: u?.full_name || '', reporter_email: u?.email || '', reported_by_id: u?.id || null })}
                  />
                ) : (
                  <input
                    value={reporterDraft.reported_by || ''}
                    onChange={(e) => {
                      setReporterDraft({ ...reporterDraft, reported_by: e.target.value, reported_by_id: null })
                      setReporterOtpVerifiedEmail('')
                    }}
                    placeholder="ชื่อผู้แจ้ง"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit' }}
                  />
                )}
              </div>
              {reporterMode === 'external' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>อีเมลผู้แจ้ง</label>
                    <input
                      type="email"
                      value={reporterDraft.reporter_email || ''}
                      onChange={(e) => {
                        setReporterDraft({ ...reporterDraft, reporter_email: e.target.value, reported_by_id: null })
                        setReporterOtpVerifiedEmail('')
                      }}
                      placeholder="example@company.com"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit' }}
                    />
                    <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>โหมดนี้จะเก็บข้อมูลเฉพาะ Incident เอกสารนี้เท่านั้น และไม่สร้าง Account ระบบ</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleRequestReporterEmailOtp}
                      disabled={reporterOtpLoading}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #1d4ed8', background: '#eff6ff', color: '#1e40af', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {reporterOtpLoading ? 'กำลังส่ง OTP...' : 'ขอ OTP ทางอีเมล'}
                    </button>
                    <input
                      value={reporterOtpCode}
                      onChange={(e) => setReporterOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="กรอก OTP 6 หลัก"
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, width: '100%', maxWidth: 170, fontFamily: 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyReporterEmailOtp}
                      disabled={reporterOtpVerifying || !reporterOtpRequested}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #059669', background: '#ecfdf5', color: '#065f46', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {reporterOtpVerifying ? 'กำลังยืนยัน...' : 'ยืนยัน OTP'}
                    </button>
                  </div>
                  {String(reporterDraft.reporter_email || '').trim().toLowerCase() === reporterOtpVerifiedEmail && reporterOtpVerifiedEmail && (
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>✓ ยืนยัน OTP แล้วสำหรับอีเมลนี้</div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={closeReporterModal} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>ยกเลิก</button>
              <button type="button" onClick={applyReporterDraft} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>ยืนยันผู้แจ้ง</button>
            </div>
          </div>
        </div>
      )}

      {/* Login Approve Modal — ไม่ต้อง PIN */}
      <UnifiedApprovalModal
        isOpen={showSignatureModal && !isRemoteApprovalMode}
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
        isOpen={showSignatureModal && isRemoteApprovalMode}
        onCancel={() => { setShowSignatureModal(false); setIsRemoteApprovalMode(false); }}
        onConfirm={handleApprove}
        approverName={currentStep?.user_profiles?.full_name || currentStep?.role_required}
        approverEmail={currentStep?.user_profiles?.email}
        userEmail={currentStep?.user_profiles?.email}
        identityHint={!currentStep?.approver_id ? `Role ${String(currentStep?.role_required || '').replace('_', ' ')} ทั้งหมด` : ''}
        targetEmail={isExternalReporterStep ? incident.reporter_email : currentStep?.user_profiles?.email}
        targetEmailLabel={isExternalReporterStep ? 'External user' : ''}
        loading={approvalLoading}
        isRemote={true}
        title="อนุมัติแทน (Remote Approve)"
        verificationMode={isExternalReporterStep ? 'otp' : 'pin'}
        onRequestOtp={async () => {
          const pendingStep = workflowSteps.find(s => s.status === 'pending')
          const res = await requestIncidentApprovalOTP(id, pendingStep?.id || null)
          if (res?.success) {
            showToast({ message: res?.message || 'ส่ง OTP เรียบร้อยแล้ว', type: 'success' })
            return { success: true }
          }
          return { success: false, message: res?.error || 'ไม่สามารถส่ง OTP ได้' }
        }}
        onTestPin={async (pin) => {
          if (isExternalReporterStep) return { success: false, message: 'โหมดผู้แจ้งภายนอกใช้ OTP เท่านั้น' }
          const pendingStep = workflowSteps.find(s => s.status === 'pending')
          const res = await diagnoseApprovalPin(id, 'incident', pendingStep.id, pin)
          if (res.success) return { success: true, message: `PIN ถูกต้องสำหรับ ${res.approver?.full_name || res.approver?.email || 'ผู้อนุมัติ'}` }
          return { success: false, message: res.error || 'PIN ไม่ถูกต้อง', details: res }
        }}
        onVerifyCode={async ({ mode, code }) => {
          const pendingStep = workflowSteps.find(s => s.status === 'pending')
          if (!pendingStep) return { success: false, message: 'ไม่พบขั้นตอนอนุมัติที่รอดำเนินการ' }

          if (mode === 'otp') {
            const res = await diagnoseIncidentApprovalOTP(id, code, pendingStep.id)
            return { success: !!res?.success, message: res?.error || res?.message || 'ไม่สามารถยืนยัน OTP ได้' }
          }

          const res = await diagnoseApprovalPin(id, 'incident', pendingStep.id, code)
          if (res.success) return { success: true, message: `PIN ถูกต้องสำหรับ ${res.approver?.full_name || res.approver?.email || 'ผู้อนุมัติ'}` }
          return { success: false, message: res.error || 'PIN ไม่ถูกต้อง' }
        }}
      />

      {!isExternalFollowupMode && (
        <WorkflowActionBar
          status={incident.status}
          canEdit={canEditDetails && incident.status !== 'Cancelled'}
          canSubmit={canSubmitForApproval && incident.status !== 'Cancelled'}
          canApprove={canApprove && incident.status !== 'Cancelled'}
          canRemoteApprove={canRemoteApprove && incident.status !== 'Cancelled'}
          canReject={canReject && incident.status !== 'Cancelled'}
          canReopen={hasFullAccess && (incident.status === 'Closed' || incident.status === 'Pending Approval')}
          canAcknowledge={canAcknowledgeIncident && incident.status !== 'Cancelled'}
          canCancel={incident.status === 'Pending Approval' && (hasFullAccess || isCreator)}
          showCancelInPendingOnly={true}
          cancelLabel="Cancel Approve"
          acknowledgeLabel={acknowledgeActionLabel}
          onSave={handleSave}
          onAcknowledge={() => setShowAcknowledgeDialog(true)}
          onSubmit={() => setShowResolveDialog(true)}
          onApprove={() => { setIsRemoteApprovalMode(false); setShowSignatureModal(true); }}
          onRemoteApprove={() => { setIsRemoteApprovalMode(true); setShowSignatureModal(true); }}
          onReject={handleRejectIncident}
          onReopen={() => setShowReopenDialog(true)}
          onCancel={handleCancel}
          onEdit={() => setEditing(true)}
          isEditing={editing}
          onCancelEdit={() => { setEditing(false); setForm(incident) }}
          loading={saving || approvalLoading}
        />
      )}

      <div className="incident-container">
        {isExternalFollowupMode && (
          <div style={{ marginBottom: 16, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
            External Follow-up Mode: โหมดติดตามเคสแบบอ่านอย่างเดียว
            {followupMeta?.expiresAt ? ` (ลิงก์หมดอายุ ${formatDateTime(followupMeta.expiresAt)})` : ''}
          </div>
        )}
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
                  background: incident.status === 'Cancelled' ? '#fee2e2' : incident.status === 'Closed' ? '#d1fae5' : '#eff6ff',
                  color: incident.status === 'Cancelled' ? '#dc2626' : incident.status === 'Closed' ? '#065f46' : '#1d4ed8', textTransform: 'uppercase'
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
          <WorkflowProgressBar
            currentStatus={incident.status}
            steps={workflowSteps}
            senderName={latestSubmittedLog?.user_full_name || ''}
            senderEmail={latestSubmittedLog?.user_email || ''}
          />
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
                {field('ระบบที่ได้รับผลกระทบ', 'affected_system', form.affected_system, systems)}
                {field('ประเภท Incident', 'category', form.category, categories)}
              </div>
              <div className="field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div className="field-label" style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>ผู้สร้าง / Creator</div>
                  <div className="field-value" style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{incident.creator?.full_name || incident.created_by || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ไม่ระบุ —</span>}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div className="field-label" style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>ผู้แจ้ง / Reporter</div>
                  {editing && (currentUser?.role === 'admin' || currentUser?.role === 'it_staff') ? (
                    <button
                      type="button"
                      onClick={openReporterModal}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: '#0f172a',
                        fontFamily: 'inherit'
                      }}
                    >
                      {form.reported_by || 'กดเพื่อเลือกผู้แจ้ง'}
                    </button>
                  ) : (
                    <div>
                      <div className="field-value" style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                        {incident.reporter?.full_name || incident.reported_by || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ยังไม่มีข้อมูล —</span>}
                      </div>
                      {canResendFollowupLink && (
                        <div style={{ marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={handleResendFollowupLink}
                            disabled={resendFollowupLoading}
                            style={{
                              padding: '7px 11px',
                              borderRadius: 8,
                              border: '1px solid #93c5fd',
                              background: resendFollowupLoading ? '#dbeafe' : '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: resendFollowupLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {resendFollowupLoading ? 'กำลังส่งลิงก์ใหม่...' : 'ส่งลิงก์ติดตามเคสใหม่'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div className="field-label" style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>ผู้รับผิดชอบ / IT Assignee</div>
                  <div className="field-value" style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{incident.assigned_to || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>— ยังไม่มีข้อมูล —</span>}</div>
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
                type="response"
                snapshot={slaSnapshot}
              />
              <SLAWidget 
                label="Resolution Time" 
                targetLabel={SLA_LABELS[incident.severity]?.resolve} 
                type="resolve"
                snapshot={slaSnapshot}
              />
            </div>

            <div className="premium-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>SLA Exclusions (Manual)</h3>
              {(currentUser?.role === 'admin' || currentUser?.role === 'it_staff') && (
                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                  <select
                    value={manualExclusion.reason_id}
                    onChange={e => setManualExclusion(prev => ({ ...prev, reason_id: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                  >
                    <option value="">เลือกเหตุผล...</option>
                    {exclusionReasons.map(r => <option key={r.id} value={r.id}>{r.value}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={formatDateOnlyDdMmmYy(splitIsoLocal(manualExclusion.start_time).date)}
                      placeholder="dd / mmm / yy"
                      onClick={() => startDatePickerRef.current?.showPicker?.()}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
                    />
                    <input
                      ref={startDatePickerRef}
                      type="date"
                      value={splitIsoLocal(manualExclusion.start_time).date}
                      min={exclusionLowerBoundIso ? splitIsoLocal(exclusionLowerBoundIso).date : undefined}
                      max={nowDateStr}
                      onChange={e => {
                        const cur = splitIsoLocal(manualExclusion.start_time)
                        setManualExclusion(prev => ({ ...prev, start_time: buildIsoLocal(e.target.value, cur.time) }))
                      }}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={splitIsoLocal(manualExclusion.start_time).time}
                      onChange={e => {
                        const cur = splitIsoLocal(manualExclusion.start_time)
                        const next = formatTimeInputProgressive(e.target.value)
                        const fallbackDate = new Date().toISOString().slice(0, 10)
                        setManualExclusion(prev => ({ ...prev, start_time: buildIsoLocal(cur.date || fallbackDate, next) }))
                      }}
                      onBlur={e => {
                        const cur = splitIsoLocal(manualExclusion.start_time)
                        const normalized = normalizeTime24h(e.target.value)
                        const fallbackDate = new Date().toISOString().slice(0, 10)
                        setManualExclusion(prev => ({ ...prev, start_time: buildIsoLocal(cur.date || fallbackDate, normalized || '00:00') }))
                      }}
                      inputMode="text"
                      placeholder="HH:mm"
                      title="รูปแบบเวลา 24 ชั่วโมง (HH:mm)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={formatDateOnlyDdMmmYy(splitIsoLocal(manualExclusion.end_time).date)}
                      placeholder="dd / mmm / yy"
                      onClick={() => endDatePickerRef.current?.showPicker?.()}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
                    />
                    <input
                      ref={endDatePickerRef}
                      type="date"
                      value={splitIsoLocal(manualExclusion.end_time).date}
                      min={splitIsoLocal(manualExclusion.start_time || exclusionLowerBoundIso || '').date || undefined}
                      max={nowDateStr}
                      onChange={e => {
                        const cur = splitIsoLocal(manualExclusion.end_time)
                        setManualExclusion(prev => ({ ...prev, end_time: buildIsoLocal(e.target.value, cur.time) }))
                      }}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={splitIsoLocal(manualExclusion.end_time).time}
                      onChange={e => {
                        const cur = splitIsoLocal(manualExclusion.end_time)
                        const next = formatTimeInputProgressive(e.target.value)
                        const fallbackDate = splitIsoLocal(manualExclusion.start_time).date || new Date().toISOString().slice(0, 10)
                        setManualExclusion(prev => ({ ...prev, end_time: buildIsoLocal(cur.date || fallbackDate, next) }))
                      }}
                      onBlur={e => {
                        const cur = splitIsoLocal(manualExclusion.end_time)
                        const normalized = normalizeTime24h(e.target.value)
                        const fallbackDate = splitIsoLocal(manualExclusion.start_time).date || new Date().toISOString().slice(0, 10)
                        setManualExclusion(prev => ({ ...prev, end_time: buildIsoLocal(cur.date || fallbackDate, normalized || '00:00') }))
                      }}
                      inputMode="text"
                      placeholder="HH:mm"
                      title="รูปแบบเวลา 24 ชั่วโมง (HH:mm)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                    />
                  </div>
                  {(manualExclusion.start_time || manualExclusion.end_time) && (
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                      Preview: Start {manualExclusion.start_time ? formatDdMmmYy24h(manualExclusion.start_time) : '—'} | End {manualExclusion.end_time ? formatDdMmmYy24h(manualExclusion.end_time) : '—'}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                    ช่วงหยุด SLA ต้องไม่ก่อน {formatDdMmmYy24h(exclusionLowerBoundIso)} และต้องไม่เป็นเวลาในอนาคต
                  </div>
                  <textarea
                    rows={2}
                    value={manualExclusion.notes}
                    onChange={e => setManualExclusion(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddManualExclusion}
                    disabled={manualExclusionLoading}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '13px', opacity: manualExclusionLoading ? 0.6 : 1, cursor: 'pointer' }}
                  >
                    {manualExclusionLoading ? 'กำลังบันทึก...' : 'เพิ่มช่วง SLA Exclusion'}
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleQuickStartManualExclusion}
                      disabled={manualExclusionLoading || !manualExclusion.reason_id || !!activeManualExclusion}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #86efac',
                        background: '#f0fdf4',
                        color: '#166534',
                        fontWeight: 700,
                        fontSize: '12px',
                        opacity: manualExclusionLoading || !manualExclusion.reason_id || !!activeManualExclusion ? 0.5 : 1,
                        cursor: manualExclusionLoading || !manualExclusion.reason_id || !!activeManualExclusion ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Start SLA Stop (Now)
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickStopManualExclusion}
                      disabled={manualExclusionLoading || !activeManualExclusion}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #fca5a5',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '12px',
                        opacity: manualExclusionLoading || !activeManualExclusion ? 0.5 : 1,
                        cursor: manualExclusionLoading || !activeManualExclusion ? 'not-allowed' : 'pointer',
                      }}
                    >
                      End SLA Stop (Now)
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {exclusions.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>ยังไม่มีรายการ Exclusion</div>
                )}
                {exclusions.map(ex => (
                  <div key={ex.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      {exclusionReasons.find(r => r.id === ex.reason_id)?.value || `Reason #${ex.reason_id}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Start: {formatDdMmmYy24h(ex.start_time)}{ex.end_time ? ` | End: ${formatDdMmmYy24h(ex.end_time)}` : ' | End: —'}
                    </div>
                    {ex.notes && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Notes: {ex.notes}</div>
                    )}
                    {!ex.end_time && (currentUser?.role === 'admin' || currentUser?.role === 'it_staff') && (
                      <button
                        type="button"
                        onClick={() => handleCloseManualExclusion(ex.id)}
                        disabled={manualExclusionLoading}
                        style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fff1f2', color: '#dc2626', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                      >
                        ปิดช่วงนี้ (End Now)
                      </button>
                    )}
                  </div>
                ))}
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
                          &quot;{log.metadata.comment}&quot;
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
      <NotificationComponent />
    </div>
  )
}

function ResolveDialog({ onCancel, onConfirm, loading, initialData = {}, severity = 'Medium' }) {
  const [data, setData] = useState({ 
    root_cause: initialData.root_cause || '', 
    resolution: initialData.resolution || '', 
    corrective_action: initialData.corrective_action || '' 
  })
  const handleConfirm = async () => {
    if (severity === 'High' && !data.corrective_action?.trim()) {
      alert('⚠️ สำหรับเคสความรุนแรงสูง (High) จำเป็นต้องระบุ "การป้องกัน (Corrective Action)" ด้วยครับ')
      return
    }
    
    const signatures = {
      it: { sig: null, name: 'IT Officer (System Log)' },
      reporter: { sig: null, name: 'Reporter (Pending Verification)' }
    }

    onConfirm({ ...data, signatures })
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
 
          <div style={{ padding: '16px 18px', background: '#eff6ff', borderRadius: '14px', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e3a8a', fontWeight: 700 }}>
            เมื่อส่งงานแล้ว ระบบจะรีเฟรชเอกสารและไปขั้นตอนอนุมัติ จากนั้นให้ยืนยันตัวตนผู้แจ้งในขั้นตอน Remote Approve ตามประเภทผู้แจ้ง (PIN/OTP)
          </div>
        </div>
 
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 900, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button 
            onClick={handleConfirm} 
            disabled={loading || !data.resolution} 
            style={{ 
              flex: 2, padding: '16px', borderRadius: '16px', border: 'none', 
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: '#fff', fontWeight: 900, fontSize: '15px', cursor: 'pointer', 
              opacity: loading || !data.resolution ? 0.5 : 1, 
              fontFamily: 'inherit', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.2)'
            }}
          >
            {loading ? 'กำลังบันทึก...' : '💾 บันทึกและส่งงาน'}
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

function AcknowledgeDialog({ onCancel, onConfirm, loading, currentSeverity, currentUser }) {
  const [severity, setSeverity] = useState(currentSeverity || 'Medium')
  const [assigneeId, setAssigneeId] = useState(currentUser?.role === 'it_staff' ? currentUser?.id : '')
  const [staffs, setStaffs] = useState([])

  const isAdminDispatch = currentUser?.role === 'admin'
  const isItStaffAccept = currentUser?.role === 'it_staff'

  useEffect(() => {
    const fetchStaffs = async () => {
      if (!isAdminDispatch) return
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, is_active')
        .eq('role', 'it_staff')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      setStaffs(data || [])
    }
    fetchStaffs()
  }, [isAdminDispatch])

  const title = isAdminDispatch ? '📌 มอบหมายงาน (Dispatch)' : '⚡ รับเรื่อง (Accept)'
  const description = isAdminDispatch
    ? 'เลือก IT Staff ที่จะเป็นผู้รับผิดชอบงาน ระบบจะบันทึกว่าคุณเป็นผู้มอบหมายงาน ไม่ใช่ผู้รับผิดชอบงาน'
    : 'คุณจะรับเคสนี้เป็นผู้รับผิดชอบงาน'
  const hasNoStaff = isAdminDispatch && staffs.length === 0
  const canConfirm = isItStaffAccept || (isAdminDispatch && assigneeId)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>{description}</p>
        
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

          {isItStaffAccept && (
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>ผู้รับผิดชอบงาน / IT Staff Assignee</label>
              <div style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: '14px', fontWeight: 800, color: '#1d4ed8' }}>
                {currentUser?.full_name || currentUser?.email || 'Current IT Staff'}
              </div>
            </div>
          )}

          {isAdminDispatch && (
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>ผู้รับผิดชอบงาน / IT Staff Assignee</label>
              {hasNoStaff && (
                <div style={{ marginBottom: '10px', padding: '10px 12px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '12px', fontWeight: 700 }}>
                  ยังไม่มี IT Staff ที่เปิดใช้งานสำหรับรับมอบหมายงาน กรุณาตรวจสอบ Account Management
                </div>
              )}
              <select 
                value={assigneeId} 
                onChange={e => setAssigneeId(e.target.value)}
                disabled={hasNoStaff}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', background: hasNoStaff ? '#f8fafc' : '#fff' }}
              >
                <option value="">เลือก IT Staff...</option>
                {staffs.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button 
            onClick={() => onConfirm({ severity, assignee_id: isItStaffAccept ? currentUser?.id : assigneeId })} 
            disabled={loading || !canConfirm} 
            style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading || !canConfirm ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            {loading ? 'กำลังบันทึก...' : (isAdminDispatch ? 'ยืนยันมอบหมายงาน' : 'ยืนยันรับเรื่อง')}
          </button>
        </div>
      </div>
    </div>
  )
}
