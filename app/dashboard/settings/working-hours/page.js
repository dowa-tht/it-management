'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SLA_LIMITS } from '@/lib/slaUtils'

const DAYS = [
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
  { id: 0, label: 'Sunday', short: 'Sun' },
]

const DEFAULT_SETTINGS = {
  start: '08:30',
  end: '17:30',
  work_days: [1, 2, 3, 4, 5],
}

const CARD_SHADOW = '0 22px 40px -28px rgba(15, 23, 42, 0.38)'
const FLOATING_SHADOW = '0 28px 60px -28px rgba(15, 23, 42, 0.28)'

const baseCardStyle = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
  backdropFilter: 'blur(18px)',
}

const inputStyle = {
  width: '100%',
  minHeight: 46,
  padding: '11px 14px',
  borderRadius: 14,
  border: '1px solid #dbe2ea',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  outline: 'none',
}

const primaryButtonStyle = {
  padding: '11px 18px',
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 16px 30px -18px rgba(29, 78, 216, 0.85)',
}

const secondaryButtonStyle = {
  padding: '10px 14px',
  border: '1px solid #dbe2ea',
  borderRadius: 14,
  background: '#ffffff',
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

function SurfaceCard({ children, style }) {
  return <div style={{ ...baseCardStyle, ...style }}>{children}</div>
}

function StatCard({ eyebrow, value, subtitle, accent, tint }) {
  return (
    <SurfaceCard style={{ padding: 18, background: tint }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent }}>{eyebrow}</div>
      <div style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 10, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{subtitle}</div>
    </SurfaceCard>
  )
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  )
}

function Badge({ label, tone = 'slate' }) {
  const tones = {
    blue: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    green: { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    amber: { background: '#fffbeb', color: '#b45309', border: '#fde68a' },
    rose: { background: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    slate: { background: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  }
  const theme = tones[tone] || tones.slate

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.background,
        color: theme.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins} นาที`
  if (mins === 0) return `${hrs} ชม.`
  return `${hrs} ชม. ${mins} นาที`
}

function calculateDailyMinutes(start, end) {
  const [sHour, sMinute] = String(start || DEFAULT_SETTINGS.start).split(':').map(Number)
  const [eHour, eMinute] = String(end || DEFAULT_SETTINGS.end).split(':').map(Number)
  const startTotal = (sHour * 60) + sMinute
  const endTotal = (eHour * 60) + eMinute
  return Math.max(0, endTotal - startTotal)
}

export default function WorkingHoursPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [slaLimits, setSlaLimits] = useState(SLA_LIMITS)

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
    setCurrentUser(profile)
  }

  async function fetchGuide() {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'working_hours_guide_content').single()
    if (data?.value) {
      setGuideContent(data.value)
      return
    }

    setGuideContent(`### ⏰ คู่มือการตั้งค่าเวลาทำการ (Working Hours Guide)
การกำหนดเวลาทำงานที่ถูกต้องช่วยให้ระบบคำนวณ SLA (Service Level Agreement) ได้อย่างแม่นยำ

---
#### **1. เวลาทำงานปกติ**
- กำหนดเวลาเริ่มงาน (Start) และเวลาเลิกงาน (End) ขององค์กร
- เวลานี้จะถูกนำไปใช้คำนวณเวลาที่ผ่านไปในแต่ละ Ticket โดยไม่รวมนอกเวลาทำงาน

---
#### **2. วันหยุดประจำสัปดาห์**
- ติ๊กถูกที่ช่อง **Is Working Day** สำหรับวันที่เป็นวันทำงาน
- วันที่ไม่ได้เลือก ระบบจะถือเป็น Non-working Day และจะไม่นำมานับ SLA
- โดยปกติคือ จันทร์ - ศุกร์`)
  }

  async function fetchSlaLimits() {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'sla_limits').maybeSingle()
    if (data?.value) setSlaLimits(data.value)
  }

  async function handleSaveGuide() {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: 'working_hours_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) {
      setMsg({ text: `Error: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
    }
    setSaving(false)
  }

  async function fetchSettings() {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'working_hours').single()
    if (data?.value) setSettings(data.value)
  }

  function handleToggleDay(dayId) {
    setSettings((prev) => {
      const isSelected = prev.work_days.includes(dayId)
      if (isSelected) {
        return { ...prev, work_days: prev.work_days.filter((id) => id !== dayId) }
      }
      return { ...prev, work_days: [...prev.work_days, dayId].sort() }
    })
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: 'working_hours', value: settings, updated_at: new Date().toISOString() })

    if (error) {
      setMsg({ text: `Error: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกการตั้งค่าเวลาทำงานเรียบร้อยแล้ว', type: 'success' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    }
    setSaving(false)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchSettings(), fetchGuide(), checkUser(), fetchSlaLimits()])
      setLoading(false)
    }
    load()
  }, [])

  const selectedDaySet = useMemo(() => new Set(settings.work_days || []), [settings.work_days])
  const workingDayLabels = useMemo(() => DAYS.filter((day) => selectedDaySet.has(day.id)).map((day) => day.short), [selectedDaySet])
  const offDayLabels = useMemo(() => DAYS.filter((day) => !selectedDaySet.has(day.id)).map((day) => day.short), [selectedDaySet])
  const dailyMinutes = useMemo(() => calculateDailyMinutes(settings.start, settings.end), [settings.end, settings.start])
  const weeklyMinutes = dailyMinutes * (settings.work_days?.length || 0)

  const responseLimits = slaLimits?.Response || {
    High: slaLimits?.High_Response || SLA_LIMITS.Response.High,
    Medium: slaLimits?.Medium_Response || SLA_LIMITS.Response.Medium,
    Low: slaLimits?.Low_Response || SLA_LIMITS.Response.Low,
  }

  const resolutionLimits = slaLimits?.Resolution || {
    High: slaLimits?.High || SLA_LIMITS.Resolution.High,
    Medium: slaLimits?.Medium || SLA_LIMITS.Resolution.Medium,
    Low: slaLimits?.Low || SLA_LIMITS.Resolution.Low,
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div
      className="working-hours-container"
      style={{
        minHeight: '100vh',
        padding: 'var(--page-padding, 24px)',
        paddingBottom: 60,
        background:
          'radial-gradient(circle at top left, rgba(59,130,246,0.11), transparent 26%), radial-gradient(circle at top right, rgba(245,158,11,0.10), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #f8fafc 56%, #f1f5f9 100%)',
      }}
    >
      <style>{`
        :root { --page-padding: 24px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        .working-animate { animation: fadeInUp 0.35s ease-out; }
        .working-shell { max-width: 1180px; margin: 0 auto; }
        .working-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
        .working-action-dock { display: flex; gap: 8px; padding: 6px; background: rgba(255,255,255,0.94); border: 1px solid rgba(226,232,240,0.95); border-radius: 20px; box-shadow: ${CARD_SHADOW}; }
        .working-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .working-main-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 18px; align-items: start; }
        .working-time-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .working-day-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .working-sla-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .working-guide-dialog { width: min(860px, calc(100vw - 24px)); max-height: 90vh; }
        .day-toggle { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .day-toggle:hover { transform: translateY(-2px); box-shadow: 0 14px 24px -20px rgba(15, 23, 42, 0.55); }
        @media (max-width: 1120px) {
          .working-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .working-main-grid { grid-template-columns: 1fr; }
          .working-day-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .working-header { align-items: stretch; }
          .working-action-dock { width: 100%; }
          .working-action-dock > * { flex: 1; }
          .working-summary-grid { grid-template-columns: 1fr; }
          .working-time-grid { grid-template-columns: 1fr; }
          .working-day-grid { grid-template-columns: 1fr; }
          .working-sla-grid { grid-template-columns: 1fr; }
          .working-guide-dialog { width: calc(100vw - 16px); }
          .working-title { font-size: 22px !important; }
        }
      `}</style>

      <div className="working-shell">
        <div className="working-header working-animate">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 22,
                  boxShadow: '0 18px 30px -18px rgba(245, 158, 11, 0.9)',
                }}
              >
                ⏰
              </div>
              <h1 className="working-title" style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
                Working Hours & SLA
                <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#fffbeb', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>
                  📖
                </button>
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 15, margin: 0, maxWidth: 760, lineHeight: 1.7 }}>
              จัดการเวลาทำงาน, วันทำงานประจำสัปดาห์ และดู SLA targets ในมุมมองที่อ่านง่ายขึ้น เพื่อให้ตั้งค่า KPI ได้มั่นใจและตรวจความถูกต้องได้ในหน้าเดียว
            </p>
          </div>

          <div className="working-action-dock">
            <button onClick={() => setSettings(DEFAULT_SETTINGS)} style={secondaryButtonStyle}>Reset Default</button>
            <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {msg.text ? (
          <div
            className="working-animate"
            style={{
              padding: '14px 18px',
              marginBottom: 18,
              borderRadius: 18,
              border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: msg.type === 'success' ? '#166534' : '#991b1b',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: CARD_SHADOW,
            }}
          >
            {msg.text}
          </div>
        ) : null}

        <div className="working-summary-grid working-animate">
          <StatCard eyebrow="Daily Hours" value={formatMinutes(dailyMinutes)} subtitle={`${settings.start} - ${settings.end} ต่อวัน`} accent="#2563eb" tint="linear-gradient(180deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Working Days" value={settings.work_days.length} subtitle={workingDayLabels.length ? workingDayLabels.join(', ') : 'No working day selected'} accent="#059669" tint="linear-gradient(180deg, rgba(236,253,245,0.96) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Weekly Capacity" value={formatMinutes(weeklyMinutes)} subtitle="ประมาณเวลาทำงานรวมที่ระบบจะนำไปนับต่อสัปดาห์" accent="#b45309" tint="linear-gradient(180deg, rgba(255,247,237,0.96) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Off Days" value={offDayLabels.length} subtitle={offDayLabels.length ? offDayLabels.join(', ') : 'No off day configured'} accent="#be123c" tint="linear-gradient(180deg, rgba(255,241,242,0.96) 0%, rgba(255,255,255,0.98) 100%)" />
        </div>

        <div className="working-main-grid working-animate">
          <SurfaceCard style={{ padding: 20 }}>
            <SectionTitle
              title="Working Hours Setup"
              subtitle="ตั้งค่าเวลาทำงานหลักขององค์กรที่ใช้ในการคำนวณ Business Minutes"
              action={<Badge label={`Current Window: ${settings.start} - ${settings.end}`} tone="blue" />}
            />

            <div style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                  border: '1px solid #dbeafe',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Configuration Impact</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  ระบบจะนับ SLA เฉพาะ {formatMinutes(dailyMinutes)} ในแต่ละวันทำงาน
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  หากมีการเปลี่ยน Start / End time หรือจำนวนวันทำงาน KPI และการแสดงผล SLA ของ Incident และ Reports จะสะท้อนตามค่านี้
                </div>
              </div>

              <div className="working-time-grid">
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>เวลาเริ่มงาน (Start Time)</label>
                  <input type="time" value={settings.start} onChange={(e) => setSettings({ ...settings, start: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>เวลาเลิกงาน (End Time)</label>
                  <input type="time" value={settings.end} onChange={(e) => setSettings({ ...settings, end: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <SectionTitle title="Working Days" subtitle="เลือกวันที่ให้นับเป็นเวลาทำการจริงขององค์กร" />
                <div className="working-day-grid">
                  {DAYS.map((day) => {
                    const isSelected = selectedDaySet.has(day.id)
                    return (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => handleToggleDay(day.id)}
                        className="day-toggle"
                        style={{
                          padding: 14,
                          borderRadius: 18,
                          border: isSelected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                          background: isSelected ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                          color: '#0f172a',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{day.label}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{day.short}</div>
                          </div>
                          <Badge label={isSelected ? 'Working' : 'Off'} tone={isSelected ? 'green' : 'slate'} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 20,
                  background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>💡</span>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                    ค่าชุดนี้จะถูกใช้ในการคำนวณระยะเวลา Incident แบบ Business Hours ทั้งในหน้า Incident Detail, Dashboard และ SLA Reports โดยจะหักลบเวลานอกทำการและวันหยุดออก
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <div style={{ display: 'grid', gap: 18 }}>
            <SurfaceCard style={{ padding: 20 }}>
              <SectionTitle title="SLA Targets" subtitle="อ้างอิงค่ามาตรฐานที่ระบบใช้คำนวณ KPI ปัจจุบัน" />
              <div className="working-sla-grid">
                {[
                  { label: 'High', color: '#dc2626', soft: '#fee2e2', response: responseLimits.High, resolution: resolutionLimits.High },
                  { label: 'Medium', color: '#d97706', soft: '#fef3c7', response: responseLimits.Medium, resolution: resolutionLimits.Medium },
                  { label: 'Low', color: '#16a34a', soft: '#dcfce7', response: responseLimits.Low, resolution: resolutionLimits.Low },
                ].map((item) => (
                  <div key={item.label} style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{item.label}</div>
                      <span style={{ padding: '5px 9px', borderRadius: 999, background: item.soft, color: item.color, fontSize: 11, fontWeight: 800 }}>
                        Severity
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ padding: 10, borderRadius: 14, background: '#f8fafc' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Response</div>
                        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{formatMinutes(item.response)}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 14, background: '#f8fafc' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolution</div>
                        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{formatMinutes(item.resolution)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard style={{ padding: 20 }}>
              <SectionTitle title="Current Policy Snapshot" subtitle="สรุปค่าที่เกี่ยวกับ Working Hours และ SLA แบบอ่านเร็ว" />
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Badge label={`Work Days: ${workingDayLabels.join(', ') || 'None'}`} tone="green" />
                  <Badge label={`Off Days: ${offDayLabels.join(', ') || 'None'}`} tone="slate" />
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  Standard Hours ตอนนี้คือ <strong style={{ color: '#0f172a' }}>{settings.start} - {settings.end}</strong> หรือประมาณ <strong style={{ color: '#0f172a' }}>{formatMinutes(dailyMinutes)}</strong> ต่อวัน
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  ตามมาตรฐาน Low severity resolution ใช้เป้าหมาย <strong style={{ color: '#0f172a' }}>{formatMinutes(resolutionLimits.Low)}</strong> ซึ่งเทียบเท่าประมาณ 3 วันทำการ
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard style={{ padding: 20 }}>
              <SectionTitle title="Why It Matters" subtitle="เชื่อมโยง configuration กับผล KPI จริง" />
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  1. Start / End time ส่งผลต่อจำนวน Business Minutes ที่ใช้วัด Response และ Resolution
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  2. วันที่ไม่ถูกเลือกใน Working Days จะถูกถือเป็น Non-working Day และระบบจะไม่นับเวลาช่วงนั้น
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  3. ถ้าต้องการให้ผล SLA ตรงกับปฏิทินองค์กร ควรตั้งค่าหน้า Holidays ควบคู่กันเสมอ
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>

      {showGuide ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 12,
          }}
        >
          <div className="working-guide-dialog" style={{ ...baseCardStyle, borderRadius: 28, overflow: 'hidden', boxShadow: FLOATING_SHADOW }}>
            <div
              style={{
                padding: '28px 32px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #f59e0b 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>⏰</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Working Hours Guide</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>คู่มือการจัดการเวลาทำงานและ SLA</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {currentUser?.role === 'admin' ? (
                  <button
                    onClick={() => setEditingGuide(!editingGuide)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 12,
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {editingGuide ? '👁 View' : '✏️ Edit'}
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setShowGuide(false)
                    setEditingGuide(false)
                  }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: 30, cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>
            </div>
            <div style={{ padding: 28, overflowY: 'auto', maxHeight: 'calc(90vh - 108px)', background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'grid', gap: 16 }}>
                  <textarea
                    value={guideContent}
                    onChange={(e) => setGuideContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 420,
                      padding: 20,
                      borderRadius: 18,
                      border: '1px solid #e2e8f0',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  />
                  <button onClick={handleSaveGuide} disabled={saving} style={{ ...primaryButtonStyle, justifySelf: 'end', opacity: saving ? 0.7 : 1 }}>
                    บันทึกคู่มือ
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        background: section.includes('####') ? '#ffffff' : 'transparent',
                        borderRadius: 20,
                        padding: section.includes('####') ? 24 : 0,
                        marginBottom: section.includes('####') ? 20 : 32,
                        borderLeft: section.includes('####') ? '5px solid #1d4ed8' : 'none',
                        boxShadow: section.includes('####') ? '0 8px 24px -20px rgba(15, 23, 42, 0.35)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section
                          .trim()
                          .split('\n')
                          .map((line, lIdx) => {
                            if (line.startsWith('####')) {
                              return (
                                <h4 key={lIdx} style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                                  {line.replace(/#/g, '').trim()}
                                </h4>
                              )
                            }
                            if (line.startsWith('###')) {
                              return (
                                <h3 key={lIdx} style={{ margin: '0 0 18px', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                                  {line.replace(/#/g, '').trim()}
                                </h3>
                              )
                            }
                            return (
                              <p key={lIdx} style={{ margin: '0 0 8px' }}>
                                {line.includes('**')
                                  ? line.split('**').map((part, index) =>
                                      index % 2 === 1 ? (
                                        <strong key={index} style={{ color: '#1e3a8a' }}>
                                          {part}
                                        </strong>
                                      ) : (
                                        part
                                      )
                                    )
                                  : line}
                              </p>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
