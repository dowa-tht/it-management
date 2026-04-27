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

  useEffect(() => { 
    const offset = new Date().getTimezoneOffset()
    getDashboardData(offset).then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  const { stats, incidentByDay, severityData, recentIncidents, recentBackups, checklists } = data

  const statCards = [
    { label: 'Incident 30 วันย้อนหลัง', value: stats.totalIncidents, color: '#1d4ed8', link: '/dashboard/incidents' },
    { label: 'High Severity', value: stats.highSeverity, color: '#dc2626', link: '/dashboard/incidents' },
    { label: 'กำลังแก้ไข', value: stats.inProgress, color: '#d97706', link: '/dashboard/incidents' },
    { label: 'Backup Success Rate', value: `${stats.backupSuccessRate}%`, color: '#059669', link: '/dashboard/backup' },
  ]

  // Calculate System Health from Checklist Docs
  let infraStatus = { title: 'IT Checklist (วันนี้)', desc: 'รอโหลดข้อมูล...', color: '#6b7280', bg: '#f3f4f6' }
  if (checklists && checklists.length > 0) {
    const allItems = checklists.flatMap(c => c.checklist_items || [])
    const totalItems = allItems.length
    const doneItems = allItems.filter(i => i.status === 'OK' || i.status === 'NG').length
    const ngItems = allItems.filter(i => i.status === 'NG').length
    
    if (ngItems > 0) {
      infraStatus = { title: 'พบปัญหาขัดข้อง', desc: `มี ${ngItems} รายการ (NG)`, color: '#dc2626', bg: '#fee2e2', isAlert: true }
    } else if (doneItems === totalItems && totalItems > 0) {
      infraStatus = { title: 'ระบบทำงานปกติ (All Systems Operational)', desc: `ตรวจครบ ${totalItems} รายการแล้ว`, color: '#059669', bg: '#d1fae5' }
    } else {
      infraStatus = { title: 'กำลังตรวจสอบ', desc: `ความคืบหน้า ${doneItems}/${totalItems}`, color: '#d97706', bg: '#fef3c7' }
    }
  } else if (checklists && checklists.length === 0) {
    infraStatus = { title: 'ยังไม่ได้สร้างเอกสาร Checklist ของวันนี้', desc: 'กรุณาไปที่เมนู IT Checklist เพื่อเริ่มงาน', color: '#6b7280', bg: '#f3f4f6' }
  }

  return (
    <div style={{ padding: 24, paddingBottom: 60 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Dashboard</h1>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      {/* System Health Section */}
      <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <Link href="/dashboard/checklist" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: infraStatus.bg, borderRadius: 12, padding: '20px 24px', 
            border: `1px solid ${infraStatus.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: infraStatus.isAlert ? '0 4px 14px 0 rgba(220, 38, 38, 0.2)' : 'none',
            transition: 'transform 0.2s', cursor: 'pointer'
          }}>
            <div>
              <div style={{ fontSize: 13, color: infraStatus.color, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>IT Checklist Status</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: infraStatus.color }}>{infraStatus.title}</div>
              <div style={{ fontSize: 13, color: infraStatus.color, opacity: 0.8, marginTop: 4 }}>{infraStatus.desc}</div>
            </div>
            <div style={{ fontSize: 32 }}>{infraStatus.isAlert ? '⚠️' : '✅'}</div>
          </div>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <Link key={s.label} href={s.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '16px', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
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
