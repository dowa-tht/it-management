'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SLA_LIMITS, normalizeSlaLimits } from '@/lib/slaUtils'
import { getSLASettingsPageData, saveSLAExclusionReason, saveSLATargets } from '@/app/actions/sla-settings'

const S = {
  page: {
    minHeight: '100vh',
    padding: 'var(--sla-page-padding, 24px)',
    paddingBottom: 72,
    background:
      'radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 30%), radial-gradient(circle at top right, rgba(16,185,129,0.10), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #f8fafc 54%, #f1f5f9 100%)',
  },
  shell: {
    maxWidth: 1180,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    marginBottom: 22,
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 23,
    background: 'linear-gradient(135deg, #2563eb 0%, #0f766e 100%)',
    boxShadow: '0 18px 32px -18px rgba(37,99,235,0.92)',
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: '#2563eb',
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.12,
    fontWeight: 900,
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    maxWidth: 720,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.7,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 999,
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)',
    gap: 18,
    alignItems: 'start',
  },
  stack: {
    display: 'grid',
    gap: 18,
  },
  card: {
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(226,232,240,0.95)',
    borderRadius: 24,
    boxShadow: '0 22px 42px -30px rgba(15,23,42,0.42)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '24px 30px',
    borderBottom: '1px solid #eef2f7',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardBody: {
    padding: '28px 30px',
  },
  compactCardBody: {
    padding: '14px 16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 900,
    color: '#0f172a',
  },
  sectionText: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.65,
  },
  severityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 14,
  },
  severityCard: {
    padding: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    background: '#ffffff',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 14,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  readonlyInput: {
    width: '100%',
    minHeight: 44,
    padding: '10px 12px',
    borderRadius: 13,
    border: '1px solid #dbe2ea',
    background: '#f8fafc',
    color: '#0f172a',
    WebkitTextFillColor: '#0f172a',
    opacity: 1,
    fontSize: 14,
    fontWeight: 800,
    outline: 'none',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  mutedNote: {
    marginTop: 14,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px dashed #cbd5e1',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6,
  },
  reasonList: {
    display: 'grid',
    gap: 10,
  },
  reasonItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '13px 14px',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 9px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    color: '#047857',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    whiteSpace: 'nowrap',
  },
  policyList: {
    display: 'grid',
    gap: 12,
  },
  policyItem: {
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 17,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
  },
  policyItemCompact: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
  },
  policyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 16,
  },
  linkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    padding: '9px 12px',
    borderRadius: 13,
    border: '1px solid #dbe2ea',
    background: '#ffffff',
    color: '#334155',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 900,
  },
  textInput: {
    width: '100%',
    minHeight: 38,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #dbe2ea',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 700,
    outline: 'none',
  },
  actionButton: {
    minHeight: 38,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },
}

function formatMinutes(minutes) {
  const total = Number(minutes) || 0
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

function workingMinutesPerDay(workingHours) {
  const start = workingHours?.start || '08:30'
  const end = workingHours?.end || '17:30'
  const [sH, sM] = start.split(':').map(Number)
  const [eH, eM] = end.split(':').map(Number)
  const mins = (eH * 60 + eM) - (sH * 60 + sM)
  return mins > 0 ? mins : 540
}

function minutesToHHmm(minutes) {
  const total = Math.max(0, Number(minutes) || 0)
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function hhmmToMinutes(value) {
  const raw = (value || '').trim()
  const match = raw.match(/^(\d{1,3}):([0-5]\d)$/)
  if (!match) return null
  const hh = Number(match[1])
  const mm = Number(match[2])
  return hh * 60 + mm
}

function minutesToDayAndHHmm(minutes, dayMinutes) {
  const total = Math.max(0, Number(minutes) || 0)
  const day = Math.floor(total / dayMinutes)
  const rem = total % dayMinutes
  return { day, hhmm: minutesToHHmm(rem) }
}

function dayAndHHmmToMinutes(dayValue, hhmmValue, dayMinutes) {
  const day = Math.max(0, Number(dayValue) || 0)
  const hm = hhmmToMinutes(hhmmValue)
  if (hm === null) return null
  return day * dayMinutes + hm
}

function SeverityCard({ severity, tone, limits, onChange, dayMinutes }) {
  const responseMin = limits?.Response?.[severity] ?? SLA_LIMITS.Response[severity]
  const resolutionMin = limits?.Resolution?.[severity] ?? SLA_LIMITS.Resolution[severity]
  const responseSplit = minutesToDayAndHHmm(responseMin, dayMinutes)
  const resolutionSplit = minutesToDayAndHHmm(resolutionMin, dayMinutes)
  const resolutionWorkingDays = (resolutionMin / dayMinutes).toFixed(2)

  return (
    <div style={{ ...S.severityCard, borderTop: `4px solid ${tone}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{severity}</div>
        <span style={{ ...S.pill, color: tone, background: '#ffffff' }}>Default</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...S.field, border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, background: '#f8fafc' }}>
          <label style={S.label}>Response</label>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
            <input
              style={{ ...S.readonlyInput, background: '#fff', fontSize: 16, fontWeight: 900 }}
              type="number"
              min={0}
              value={responseSplit.day}
              onChange={(e) => {
                const next = dayAndHHmmToMinutes(e.target.value, responseSplit.hhmm, dayMinutes)
                if (next !== null) onChange('Response', severity, next)
              }}
              aria-label={`${severity} response SLA day`}
              placeholder="0"
            />
            <input
              style={{ ...S.readonlyInput, background: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '0.04em' }}
              type="text"
              inputMode="numeric"
              value={responseSplit.hhmm}
              onChange={(e) => {
                const v = e.target.value
                if (!/^[\d:]*$/.test(v)) return
                const mins = dayAndHHmmToMinutes(responseSplit.day, v, dayMinutes)
                if (mins !== null) onChange('Response', severity, mins)
              }}
              placeholder="00:00"
              aria-label={`${severity} response SLA HH:mm`}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>DAY</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TIME (HH:mm)</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Format: DAY + HH:mm เช่น 0 + 00:30, 0 + 06:30</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>= {formatMinutes(responseMin)}</div>
        </div>
        <div style={{ ...S.field, border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, background: '#f8fafc' }}>
          <label style={S.label}>Resolution</label>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
            <input
              style={{ ...S.readonlyInput, background: '#fff', fontSize: 16, fontWeight: 900 }}
              type="number"
              min={0}
              value={resolutionSplit.day}
              onChange={(e) => {
                const next = dayAndHHmmToMinutes(e.target.value, resolutionSplit.hhmm, dayMinutes)
                if (next !== null) onChange('Resolution', severity, next)
              }}
              aria-label={`${severity} resolution SLA day`}
              placeholder="0"
            />
            <input
              style={{ ...S.readonlyInput, background: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '0.04em' }}
              type="text"
              inputMode="numeric"
              value={resolutionSplit.hhmm}
              onChange={(e) => {
                const v = e.target.value
                if (!/^[\d:]*$/.test(v)) return
                const mins = dayAndHHmmToMinutes(resolutionSplit.day, v, dayMinutes)
                if (mins !== null) onChange('Resolution', severity, mins)
              }}
              placeholder="00:00"
              aria-label={`${severity} resolution SLA HH:mm`}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>DAY</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TIME (HH:mm)</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Format: DAY + HH:mm เช่น 3 + 00:00</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
            = {formatMinutes(resolutionMin)} (~ {resolutionWorkingDays} working day)
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ title, subtitle, children, action }) {
  return (
    <section style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <h2 style={S.sectionTitle}>{title}</h2>
          {subtitle ? <p style={S.sectionText}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div style={S.cardBody}>{children}</div>
    </section>
  )
}

export default function SLASettingsPage() {
  const [loading, setLoading] = useState(true)
  const [savingTargets, setSavingTargets] = useState(false)
  const [savingReason, setSavingReason] = useState(false)
  const [limits, setLimits] = useState(SLA_LIMITS)
  const [workingHours, setWorkingHours] = useState({ start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] })
  const [holidaysCount, setHolidaysCount] = useState(0)
  const [reasons, setReasons] = useState([])
  const [newReason, setNewReason] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const workDaysLabel = (workingHours.work_days || [])
    .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] || '')
    .filter(Boolean)
    .join(', ')
  const dayMinutes = workingMinutesPerDay(workingHours)

  const loadData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const res = await getSLASettingsPageData()
      if (!res?.success) throw new Error(res?.error || 'Failed to load SLA settings')
      const normalizedLimits = normalizeSlaLimits(res.data.slaLimits || SLA_LIMITS)
      setLimits(normalizedLimits)
      if (!res.data?.slaLimits) {
        await saveSLATargets(normalizedLimits)
      }
      setWorkingHours(res.data.workingHours || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] })
      setReasons(res.data.exclusionReasons || [])
      setHolidaysCount(res.data.holidaysCount || 0)
    } catch (err) {
      setStatusMsg(`Load failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLimitChange = (group, severity, value) => {
    setLimits((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [severity]: Math.max(0, Number(value) || 0),
      },
    }))
  }

  const handleSaveTargets = async () => {
    setSavingTargets(true)
    setStatusMsg('')
    try {
      const res = await saveSLATargets(limits)
      if (!res?.success) throw new Error(res?.error || 'Failed to save SLA targets')
      setStatusMsg('SLA targets saved successfully')
      setLimits(res.data)
    } catch (err) {
      setStatusMsg(`Save targets failed: ${err.message}`)
    } finally {
      setSavingTargets(false)
    }
  }

  const handleAddReason = async () => {
    if (!newReason.trim()) return
    setSavingReason(true)
    setStatusMsg('')
    try {
      const res = await saveSLAExclusionReason({ action: 'create', value: newReason })
      if (!res?.success) throw new Error(res?.error || 'Failed to add exclusion reason')
      setReasons(res.data.exclusionReasons || [])
      setNewReason('')
      setStatusMsg('Exclusion reason added')
    } catch (err) {
      setStatusMsg(`Save reason failed: ${err.message}`)
    } finally {
      setSavingReason(false)
    }
  }

  const handleToggleReason = async (reason) => {
    setSavingReason(true)
    setStatusMsg('')
    try {
      const res = await saveSLAExclusionReason({ action: 'toggle', id: reason.id, is_active: reason.is_active })
      if (!res?.success) throw new Error(res?.error || 'Failed to toggle reason')
      setReasons(res.data.exclusionReasons || [])
      setStatusMsg('Exclusion reason updated')
    } catch (err) {
      setStatusMsg(`Update reason failed: ${err.message}`)
    } finally {
      setSavingReason(false)
    }
  }

  return (
    <div style={S.page}>
      <style>{`
        :root { --sla-page-padding: 24px; }
        * { box-sizing: border-box; }
        .sla-settings-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.65fr); gap: 18px; align-items: start; }
        .sla-severity-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .sla-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 1120px) {
          .sla-settings-grid { grid-template-columns: 1fr; }
          .sla-severity-grid { grid-template-columns: 1fr; }
          .sla-info-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          :root { --sla-page-padding: 12px; }
          .sla-settings-title { font-size: 24px !important; }
        }
      `}</style>

      <div style={S.shell}>
        <header style={S.header}>
          <div>
            <div style={S.headerTitleRow}>
              <div style={S.iconBox}>⏱</div>
              <div>
                <p style={S.eyebrow}>System Setup</p>
                <h1 className="sla-settings-title" style={S.title}>SLA Settings</h1>
              </div>
            </div>
            <p style={S.subtitle}>
              Central SLA policy workspace for compliance targets, exclusion reasons, calculation policy,
              and working-time references.
            </p>
          </div>
          <span style={S.badge}>{loading ? 'Loading...' : 'Connected to settings action'}</span>
        </header>
        {statusMsg ? (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 12, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', fontSize: 13, fontWeight: 700 }}>
            {statusMsg}
          </div>
        ) : null}

        <div className="sla-settings-grid">
          <div style={S.stack}>
            <Card
              title="SLA Targets / Compliance Criteria"
              subtitle="กำหนดเป้าหมาย SLA แบบ DAY + HH:mm และบันทึกเป็นนาทีรวมอัตโนมัติ"
              action={<button type="button" onClick={handleSaveTargets} disabled={savingTargets || loading} style={{ ...S.actionButton, minHeight: 44, fontSize: 14, padding: '10px 14px' }}>{savingTargets ? 'Saving...' : 'Save Targets'}</button>}
            >
              <div className="sla-severity-grid">
                <SeverityCard severity="High" tone="#dc2626" limits={limits} onChange={handleLimitChange} dayMinutes={dayMinutes} />
                <SeverityCard severity="Medium" tone="#f59e0b" limits={limits} onChange={handleLimitChange} dayMinutes={dayMinutes} />
                <SeverityCard severity="Low" tone="#16a34a" limits={limits} onChange={handleLimitChange} dayMinutes={dayMinutes} />
              </div>
              <div style={S.mutedNote}>
                Scope: values are persisted to <strong>system_settings.sla_limits</strong>.
                <br />
                Format: ทั้ง Response และ Resolution ใช้ <strong>DAY + HH:mm</strong> (เช่น 0 + 06:30, 3 + 00:00) โดย 1 working day = {Math.floor(dayMinutes / 60)} ชั่วโมงทำงาน.
              </div>
            </Card>
          </div>

          <aside style={S.stack}>
            <Card
              title="SLA Exclusion Reason"
              subtitle="Reasons used to pause SLA when delay is outside IT control."
              action={<button type="button" onClick={loadData} disabled={loading || savingReason} style={S.actionButton}>Refresh</button>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
                <input
                  style={S.textInput}
                  value={newReason}
                  placeholder="New exclusion reason"
                  onChange={(e) => setNewReason(e.target.value)}
                />
                <button type="button" onClick={handleAddReason} disabled={savingReason || !newReason.trim()} style={S.actionButton}>
                  {savingReason ? 'Saving...' : 'Add'}
                </button>
              </div>
              <div style={S.reasonList}>
                {reasons.map((reason) => (
                  <div key={reason.id} style={S.reasonItem}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{reason.value}</span>
                    <button type="button" onClick={() => handleToggleReason(reason)} disabled={savingReason} style={S.pill}>
                      {reason.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
              <div style={S.mutedNote}>
                Binding source: <strong>master_data.type = sla_exclusion_reason</strong> (toggle active/inactive supported).
              </div>
            </Card>
          </aside>
        </div>

        <div className="sla-info-grid" style={{ marginTop: 12 }}>
          <section style={S.card}>
            <div style={{ ...S.cardHeader, padding: '14px 16px' }}>
              <h2 style={{ ...S.sectionTitle, fontSize: 16 }}>SLA Calculation Policy</h2>
            </div>
            <div style={S.compactCardBody}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={S.policyItemCompact}>
                  <div style={{ ...S.policyIcon, width: 24, height: 24, borderRadius: 8, fontSize: 12 }}>R</div>
                  <div style={{ fontSize: 12, color: '#334155' }}>Response: created → acknowledged/assigned</div>
                </div>
                <div style={S.policyItemCompact}>
                  <div style={{ ...S.policyIcon, width: 24, height: 24, borderRadius: 8, fontSize: 12 }}>F</div>
                  <div style={{ fontSize: 12, color: '#334155' }}>Resolution: acknowledged/assigned → resolved (deduct exclusions)</div>
                </div>
                <div style={S.policyItemCompact}>
                  <div style={{ ...S.policyIcon, width: 24, height: 24, borderRadius: 8, fontSize: 12 }}>P</div>
                  <div style={{ fontSize: 12, color: '#334155' }}>Pending Approval pauses Resolution SLA</div>
                </div>
              </div>
            </div>
          </section>

          <section style={S.card}>
            <div style={{ ...S.cardHeader, padding: '14px 16px' }}>
              <h2 style={{ ...S.sectionTitle, fontSize: 16 }}>Working Hours / Holidays</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/dashboard/settings/working-hours" style={S.linkButton}>Working Hours</Link>
                <Link href="/dashboard/settings/holidays" style={S.linkButton}>Holidays</Link>
              </div>
            </div>
            <div style={S.compactCardBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={S.policyItemCompact}><div style={{ fontSize: 12, fontWeight: 900, color: '#64748b' }}>T</div><div style={{ fontSize: 12, color: '#334155' }}>Working Time: <strong>{workingHours.start} - {workingHours.end}</strong></div></div>
                <div style={S.policyItemCompact}><div style={{ fontSize: 12, fontWeight: 900, color: '#64748b' }}>D</div><div style={{ fontSize: 12, color: '#334155' }}>Work Days: <strong>{workDaysLabel || 'Not set'}</strong></div></div>
                <div style={S.policyItemCompact}><div style={{ fontSize: 12, fontWeight: 900, color: '#64748b' }}>H</div><div style={{ fontSize: 12, color: '#334155' }}>Holidays: <strong>{holidaysCount} day(s)</strong></div></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
