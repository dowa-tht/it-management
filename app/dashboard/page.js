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

function StatusCard({ title, value, status }) {
  const getColors = (s) => {
    switch(s) {
      case 'ok': case 'done': return { bg: '#f0fdf4', color: '#059669', border: '#bcf2d9' }
      case 'ng': return { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
      case 'in-progress': return { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' }
      case 'pending': return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
      case 'missed': return { bg: '#fff1f2', color: '#e11d48', border: '#fda4af' }
      default: return { bg: '#f9fafb', color: '#9ca3af', border: '#e5e7eb' }
    }
  }
  const c = getColors(status)
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

function calcElapsedMin(start, end) {
  if (!start) return null
  return Math.floor((new Date(end) - new Date(start)) / 60000)
}

function getSLAStatus(incident) {
  const sla = SLA_MINUTES[incident.severity] || SLA_MINUTES['Medium']
  const now = new Date()
  
  if (incident.status === 'Closed') return { label: '✔ Closed', color: '#059669', bg: '#d1fae5', text: 'เสร็จสิ้น/ปิดงาน' }
  
  if (incident.status === 'Open') {
    const elapsed = calcElapsedMin(incident.created_at, now)
    const limit = sla.response
    if (elapsed > limit) return { label: '🔴 Overdue (Resp)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: '🟢 Normal', color: '#059669', bg: '#d1fae5', text: `${elapsed}/${limit}m` }
  }
  
  if (incident.status === 'In Progress' || incident.status === 'Pending Approval') {
    const elapsed = calcElapsedMin(incident.created_at, now)
    const limit = sla.resolve
    if (elapsed > limit) return { label: '🔴 Overdue (Res)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: incident.status === 'Pending Approval' ? '🟣 Pending' : '🟢 Normal', color: incident.status === 'Pending Approval' ? '#701a75' : '#059669', bg: incident.status === 'Pending Approval' ? '#f5d0fe' : '#d1fae5', text: `${elapsed}/${limit}m` }
  }

  // Default fallback for any other status (Transparent Error per Policy)
  return { label: `❓ ${incident.status}`, color: '#6b7280', bg: '#f3f4f6', text: 'Unknown Status' }
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

  const { stats = {}, incidentByDay = [], severityData = [], recentIncidents = [], recentBackups = [], checklists = [] } = data || {}

  const statCards = [
    { label: 'Incident 30 วัน', value: stats.totalIncidents, color: '#1d4ed8', link: '/dashboard/incidents?date=30days' },
    { label: 'High Severity', value: stats.highSeverity, color: '#dc2626', link: '/dashboard/incidents?severity=High&date=30days' },
    { label: 'รออนุมัติ', value: stats.pending, color: '#701a75', link: '/dashboard/incidents?status=Pending+Approval&date=30days' },
    { label: 'กำลังแก้ไข', value: stats.inProgress, color: '#d97706', link: '/dashboard/incidents?status=InProgress&date=30days' },
    { label: 'Backup Rate', value: `${stats.backupSuccessRate}%`, color: '#059669', link: '/dashboard/backup' },
  ]

  const ca = data.checklistActions

  // Helper for Streak Colors
  const getStreakColor = (status) => {
    switch(status) {
      case 'ok': return '#10b981'
      case 'ng': return '#ef4444'
      case 'missed': return '#f87171'
      case 'in-progress': return '#facc15' // Yellow-400
      case 'pending': return '#f59e0b'
      case 'skip': return '#e5e7eb'
      default: return '#e5e7eb'
    }
  }

  return (
    <div className="dashboard-container" style={{ padding: 'var(--dashboard-padding, 24px)', paddingBottom: 60 }}>
      <style>{`
        :root { --dashboard-padding: 24px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dashboard-container { animation: fadeIn 0.4s ease-out; }
        
        @media (max-width: 768px) {
          :root { --dashboard-padding: 12px; }
          .header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .stat-grid-dynamic { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important; gap: 8px !important; }
          .chart-row { grid-template-columns: 1fr !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .main-dashboard-grid { grid-template-columns: 1fr !important; }
          .checklist-status-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-action-card { padding: 16px !important; }
          .quick-action-title { font-size: 18px !important; }
          .dashboard-title { font-size: 20px !important; }
        }
        
        @media (min-width: 769px) {
          .main-dashboard-grid { grid-template-columns: 1.6fr 1fr !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="header-flex" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dashboard-title" style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Dashboard</h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
             📅 {formatDate(new Date().toISOString())}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* 1. Waiting for Approval (For Approver) */}
          <Link href="/dashboard/approvals" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: data.pendingApprovalsCount > 0 ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f3f4f6', 
              borderRadius: 10, 
              padding: '8px 16px', 
              color: data.pendingApprovalsCount > 0 ? '#fff' : '#9ca3af', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              cursor: 'pointer', 
              transition: 'transform 0.15s', 
              border: data.pendingApprovalsCount > 0 ? 'none' : '1px solid #e5e7eb',
              boxShadow: data.pendingApprovalsCount > 0 ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none',
              minWidth: 140
            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ fontSize: 20, filter: data.pendingApprovalsCount > 0 ? 'none' : 'grayscale(1)' }}>🔔</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Approvals</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{data.pendingApprovalsCount}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Items</span>
                </div>
              </div>
            </div>
          </Link>

          {/* 2. My Sent Pending Items (For Sender) */}
          <Link href="/dashboard/my-pending" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: data.myPendingFollowupsCount > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f3f4f6', 
              borderRadius: 10, 
              padding: '8px 16px', 
              color: data.myPendingFollowupsCount > 0 ? '#fff' : '#9ca3af', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              cursor: 'pointer', 
              transition: 'transform 0.15s', 
              border: data.myPendingFollowupsCount > 0 ? 'none' : '1px solid #e5e7eb',
              boxShadow: data.myPendingFollowupsCount > 0 ? '0 4px 10px rgba(217, 119, 6, 0.2)' : 'none'
            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ fontSize: 20, filter: data.myPendingFollowupsCount > 0 ? 'none' : 'grayscale(1)' }}>📤</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>My Sent Pending</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{data.myPendingFollowupsCount}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Items</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 🚀 Quick Actions for Member */}
      {data.userProfile?.role === 'member' && (
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard/incidents/new" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card" style={{ 
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              borderRadius: 16,
              padding: '24px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.4)',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ fontSize: 40, background: 'rgba(255,255,255,0.2)', width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🚨
                </div>
                <div>
                  <div className="quick-action-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>แจ้งปัญหาไอที (Report Issue)</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>หากคุณพบปัญหาคอมพิวเตอร์ ระบบ หรืออุปกรณ์ต่างๆ แจ้งได้ที่นี่ทันที</div>
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center' }}>+ แจ้งเรื่องใหม่</div>
            </div>
          </Link>
        </div>
      )}

      {/* IT Checklist & SLA Tracking (IT Only) */}
      <div className="main-dashboard-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 16, 
        marginBottom: 20 
      }}>
        {/* IT Checklist Section */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div className="responsive-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>IT Checklist Compliance</h2>
              <div style={{ fontSize: 12, color: '#6b7280' }}>สถานะการตรวจสอบระบบ IT ประจำรอบเวลา</div>
            </div>
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

          <div className="checklist-status-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
            gap: 10 
          }}>
            <StatusCard title="Daily" value={ca?.dailyStatus?.label || 'รอตรวจ'} status={ca?.dailyStatus?.status} />
            <StatusCard title="Weekly" value={ca?.weeklyStatus?.label || 'รอตรวจ'} status={ca?.weeklyStatus?.status} />
            <StatusCard title="Monthly" value={ca?.monthlyStatus?.label || 'รอตรวจ'} status={ca?.monthlyStatus?.status} />
            <StatusCard title="Yearly" value={ca?.yearlyStatus?.label || 'รอตรวจ'} status={ca?.yearlyStatus?.status} />
          </div>
        </div>

        {/* SLA KPI Card */}
        <Link href="/dashboard/reports/sla" style={{ textDecoration: 'none', display: 'flex' }}>
          <div style={{ flex: 1, background: stats.slaComplianceRate >= 95 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', borderRadius: 12, padding: '14px 18px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ position: 'absolute', right: -15, top: -15, fontSize: 80, opacity: 0.1 }}>🎯</div>
            <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>SLA Compliance Rate (YTD)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.slaComplianceRateYTD}%</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>YTD</div>
            </div>
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>ถึง 01 ม.ค. {new Date().getFullYear() + 543}</div>
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', height: 5, borderRadius: 10 }}>
              <div style={{ background: '#fff', height: '100%', borderRadius: 10, width: `${Math.min(100, stats.slaComplianceRate)}%` }} />
            </div>
          </div>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid-dynamic" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 12, 
        marginBottom: 20 
      }}>
        {statCards.map(s => (
          <Link key={s.label} href={s.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{s.sub}</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row (IT Only) */}
      <div className="chart-row" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: 16, 
        marginBottom: 20 
      }}>
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

      {/* 📋 My Recent Requests (Member Only) */}
      {data.userProfile?.role === 'member' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📋 My Recent Requests (งานแจ้งซ่อมของฉัน)</div>
              <Link href="/dashboard/incidents" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>ดูทั้งหมด →</Link>
            </div>
            <div style={{ padding: '8px' }}>
              {data.myRecentIncidents?.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>ยังไม่มีรายการแจ้งซ่อมของคุณ</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                  {data.myRecentIncidents?.map(inc => (
                    <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ 
                        padding: 14, borderRadius: 12, border: '1px solid #f1f5f9', background: '#f8fafc',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                      }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.status === 'Closed' ? '#10b981' : '#f59e0b' }}></div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{inc.title}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{inc.case_number} • {formatDate(inc.created_at)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', background: '#fff', padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          {inc.status}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                        <span style={{ 
                          background: inc.status === 'Open' ? '#dbeafe' : inc.status === 'In Progress' ? '#fef3c7' : inc.status === 'Pending Approval' ? '#f5d0fe' : '#d1fae5', 
                          color: inc.status === 'Open' ? '#1e40af' : inc.status === 'In Progress' ? '#92400e' : inc.status === 'Pending Approval' ? '#701a75' : '#065f46', 
                          padding: '2px 8px', borderRadius: 20, fontSize: 11 
                        }}>
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
