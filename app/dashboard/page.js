'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/dateFormat'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getDashboardData } from '@/app/actions/dashboard'

const SLA_MINUTES = {
  High: { response: 15, resolve: 240 },
  Medium: { response: 30, resolve: 480 },
  Low: { response: 60, resolve: 1440 }
}

function calcElapsedMin(start, end) {
  if (!start) return null
  return Math.floor((new Date(end) - new Date(start)) / 60000)
}

function getSLAStatus(incident) {
  const sla = SLA_MINUTES[incident.severity] || SLA_MINUTES['Medium']
  const now = new Date()
  
  if (incident.status === 'Resolved') return { label: '✔ Closed', color: '#059669', bg: '#d1fae5', text: 'จบงานแล้ว' }
  
  if (incident.status === 'Open') {
    const elapsed = calcElapsedMin(incident.created_at, now)
    const limit = sla.response
    if (elapsed > limit) return { label: '🔴 Overdue (Resp)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: '🟢 Normal', color: '#059669', bg: '#d1fae5', text: `${elapsed}/${limit}m` }
  }
  
  if (incident.status === 'In Progress') {
    const elapsed = calcElapsedMin(incident.created_at, now)
    const limit = sla.resolve
    if (elapsed > limit) return { label: '🔴 Overdue (Res)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: '🟢 Normal', color: '#059669', bg: '#d1fae5', text: `${elapsed}/${limit}m` }
  }
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Auto-refresh SLA every minute
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboardData = async () => {
    try {
      const offset = new Date().getTimezoneOffset()
      const res = await getDashboardData(offset)
      setData(res)
      setLoading(false)
    } catch (err) {
      console.error("Dashboard Load Error:", err)
      setData({ error: err.message || String(err) })
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    // Auto-refresh dashboard every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
  if (data?.error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาดในการโหลดข้อมูล: {data.error}</div>
  if (!data) return null

  const { stats, incidentByDay, severityData, recentIncidents, recentBackups, checklists } = data

  const statCards = [
    { label: 'Incident 30 วัน', value: stats.totalIncidents, color: '#1d4ed8', link: '/dashboard/incidents?date=30days' },
    { label: 'High Severity', value: stats.highSeverity, color: '#dc2626', link: '/dashboard/incidents?severity=High&date=30days' },
    { label: 'กำลังแก้ไข', value: stats.inProgress, color: '#d97706', link: '/dashboard/incidents?status=InProgress&date=30days' },
    { label: 'รอรับเรื่อง', value: stats.openIncidents, color: '#4f46e5', link: '/dashboard/incidents?status=Open&date=30days' },
    { label: 'SLA Success', value: `${stats.slaComplianceRate}%`, color: stats.slaComplianceRate >= 95 ? '#059669' : '#dc2626', link: '/dashboard/incidents?status=Resolved&date=30days' },
    { label: 'Backup Rate', value: `${stats.backupSuccessRate}%`, color: '#059669', link: '/dashboard/backup' },
  ]

  const ca = data.checklistActions

  // Helper for Streak Colors
  const getStreakColor = (status) => {
    switch(status) {
      case 'ok': return '#10b981'
      case 'ng': return '#ef4444'
      case 'missed': return '#f87171'
      case 'pending': return '#f59e0b'
      case 'skip': return '#e5e7eb'
      default: return '#e5e7eb'
    }
  }

  return (
    <div style={{ padding: 24, paddingBottom: 60 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Dashboard</h1>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      {/* IT Checklist Tracking Section */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div className="responsive-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>IT Checklist Compliance</h2>
              <div style={{ fontSize: 12, color: '#6b7280' }}>สถานะการตรวจสอบระบบ IT ประจำรอบเวลา</div>
            </div>
            
            {/* Health Streak */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Daily Streak</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {ca?.streak?.map((s, idx) => (
                  <div key={idx} title={`${s.date}: ${s.label}`} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: getStreakColor(s.status),
                    border: s.status === 'skip' ? '1px solid #d1d5db' : 'none',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid-3-2-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* Daily */}
            <Link href={ca?.dailyStatus?.ngCount > 0 ? "/dashboard/checklist?filter=ng&freq_type=Daily" : "/dashboard/checklist"} style={{ textDecoration: 'none' }}>
              <div style={{ background: ca?.dailyStatus?.status === 'ok' ? '#ecfdf5' : ca?.dailyStatus?.status === 'ng' ? '#fef2f2' : ca?.dailyStatus?.status === 'in-progress' ? '#eff6ff' : ca?.dailyStatus?.status === 'skip' ? '#f9fafb' : '#fffbeb', border: `1px solid ${ca?.dailyStatus?.status === 'ok' ? '#a7f3d0' : ca?.dailyStatus?.status === 'ng' ? '#fecaca' : ca?.dailyStatus?.status === 'in-progress' ? '#bfdbfe' : ca?.dailyStatus?.status === 'skip' ? '#e5e7eb' : '#fde68a'}`, borderRadius: 10, padding: 12, transition: 'transform 0.15s', cursor: 'pointer' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Daily</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{ca?.dailyStatus?.status === 'ok' ? '✅' : ca?.dailyStatus?.status === 'ng' || ca?.dailyStatus?.status === 'missed' ? '⚠️' : ca?.dailyStatus?.status === 'in-progress' ? '🔄' : ca?.dailyStatus?.status === 'skip' ? '🌴' : '⏳'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ca?.dailyStatus?.label || 'รอตรวจ'}</span>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/checklist" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Weekly</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{ca?.weeklyStatus?.status === 'done' ? '✅' : '📅'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ca?.weeklyStatus?.label || 'รอตรวจ'}</span>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/checklist" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Monthly</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{ca?.monthlyStatus?.status === 'done' ? '✅' : '📊'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ca?.monthlyStatus?.label || 'รอตรวจ'}</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* SLA KPI Gauge Card */}
        <Link href="/dashboard/reports/sla" style={{ textDecoration: 'none', display: 'flex' }}>
          <div style={{ flex: 1, background: stats.slaComplianceRate >= 95 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', borderRadius: 12, padding: 20, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 100, opacity: 0.1 }}>🎯</div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>SLA Compliance Rate (YTD)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 42, fontWeight: 800 }}>{stats.slaComplianceRate}%</div>
              <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>/ 95% Target</div>
            </div>
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', height: 6, borderRadius: 10 }}>
              <div style={{ background: '#fff', height: '100%', borderRadius: 10, width: `${Math.min(100, stats.slaComplianceRate)}%`, boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />
            </div>
            <div style={{ fontSize: 11, marginTop: 12, opacity: 0.9, fontWeight: 500 }}>
              {stats.slaComplianceRate >= 95 ? '✅ ผ่านเป้าหมาย (คลิกเพื่อดูรายงาน)' : '⚠️ ต่ำกว่าเป้าหมาย (คลิกเพื่อดูรายงาน)'}
            </div>
          </div>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <Link key={s.label} href={s.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Incident 7 วันล่าสุด</div>
          {incidentByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Incident" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              ยังไม่มีข้อมูล Incident
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Severity Breakdown</div>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents with SLA */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Incident ล่าสุด (SLA Tracking)</div>
          <Link href="/dashboard/incidents" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>
        {recentIncidents.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>ยังไม่มี Incident</div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Case ID', 'หัวข้อ', 'Severity', 'Status', 'SLA & Time', 'วันที่'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map(inc => {
                  const sla = getSLAStatus(inc)
                  return (
                    <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>{inc.case_number}</td>
                      <td style={{ padding: '10px 16px', color: '#111827' }}>{inc.title}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: inc.severity === 'High' ? '#fee2e2' : inc.severity === 'Medium' ? '#fef3c7' : '#d1fae5', color: inc.severity === 'High' ? '#991b1b' : inc.severity === 'Medium' ? '#92400e' : '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: inc.status === 'Open' ? '#dbeafe' : inc.status === 'In Progress' ? '#fef3c7' : '#d1fae5', color: inc.status === 'Open' ? '#1e40af' : inc.status === 'In Progress' ? '#92400e' : '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                          {inc.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: sla.bg, color: sla.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {sla.label}
                          </span>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>{sla.text}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(inc.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Backup */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Backup Log ล่าสุด</div>
          <Link href="/dashboard/backup" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>
        {recentBackups.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>ยังไม่มีข้อมูล Backup</div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['วันที่', 'ระบบ', 'สถานะ', 'หมายเหตุ'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBackups.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{formatDate(b.log_date)}</td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{b.system_name}</td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: b.status === 'Success' ? '#d1fae5' : b.status === 'Failed' ? '#fee2e2' : '#f3f4f6', color: b.status === 'Success' ? '#065f46' : b.status === 'Failed' ? '#991b1b' : '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
