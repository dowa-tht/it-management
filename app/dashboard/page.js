'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/dateFormat'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getDashboardData } from '@/app/actions/dashboard'
import { calculateNetBusinessMinutes } from '@/lib/slaUtils'
import DashboardHeader from '@/components/DashboardHeader'
 
 const SLA_MINUTES = {
   High: { response: 60, resolve: 240 },
   Medium: { response: 120, resolve: 480 },
   Low: { response: 360, resolve: 1620 }
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

function EmployeeStatCard({ label, value, icon, gradient, link }) {
  return (
    <Link href={link} style={{ textDecoration: 'none' }}>
      <div style={{ 
        background: gradient,
        borderRadius: 16,
        padding: '20px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 110
      }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 64, opacity: 0.15 }}>{icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 800 }}>{value}</div>
      </div>
    </Link>
  )
}

function calcElapsedMin(start, end) {
  if (!start) return null
  return Math.floor((new Date(end) - new Date(start)) / 60000)
}

function getSLAStatus(incident, settings, holidays) {
  const sla = SLA_MINUTES[incident.severity] || SLA_MINUTES['Medium']
  const now = new Date()
  
  if (incident.status === 'Closed') return { label: '✔ Closed', color: '#059669', bg: '#d1fae5', text: 'เสร็จสิ้น/ปิดงาน' }
  
  const wh = settings || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }
  const hols = holidays || []

  if (incident.status === 'Open') {
    const elapsed = calculateNetBusinessMinutes(incident.created_at, now, wh, hols, [])
    const limit = sla.response
    if (elapsed > limit) return { label: '🔴 Overdue (Resp)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: '🟢 Normal', color: '#059669', bg: '#d1fae5', text: `${elapsed}/${limit}m` }
  }
  
  if (incident.status === 'In Progress' || incident.status === 'Pending Approval') {
    const elapsed = calculateNetBusinessMinutes(incident.created_at, now, wh, hols, [])
    const limit = sla.resolve
    if (elapsed > limit) return { label: '🔴 Overdue (Res)', color: '#dc2626', bg: '#fee2e2', text: `${elapsed}/${limit}m` }
    if (elapsed > limit * 0.75) return { label: '🟡 Warning', color: '#d97706', bg: '#fef3c7', text: `${elapsed}/${limit}m` }
    return { label: incident.status === 'Pending Approval' ? '🟣 Pending' : '🟢 Normal', color: incident.status === 'Pending Approval' ? '#701a75' : '#059669', bg: incident.status === 'Pending Approval' ? '#f5d0fe' : '#d1fae5', text: `${elapsed}/${limit}m` }
  }

  return { label: `❓ ${incident.status}`, color: '#6b7280', bg: '#f3f4f6', text: 'Unknown Status' }
}

function EmployeeDashboard({ data }) {
  const { employeeStats = {}, myRecentIncidents = [], userProfile = {} } = data
  
  return (
    <div className="member-dashboard" style={{ animation: 'fadeIn 0.5s ease-out' }}>
       <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>ยินดีต้อนรับกลับมา,</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{userProfile.full_name || userProfile.email} 👋</div>
          </div>

          <Link href="/dashboard/incidents/new" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card" style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              borderRadius: 16,
              padding: '24px 32px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ fontSize: 40, background: 'rgba(255,255,255,0.2)', width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🚨
                </div>
                <div>
                  <div className="quick-action-title" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>แจ้งปัญหาไอที (Report Issue)</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>หากคุณพบปัญหาคอมพิวเตอร์ ระบบ หรืออุปกรณ์ต่างๆ แจ้งได้ที่นี่ทันที</div>
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#2563eb', padding: '10px 20px', borderRadius: 12 }}>
                <span>+</span> แจ้งเรื่องใหม่
              </div>
            </div>
          </Link>
       </div>

       <div className="stat-grid-dynamic" style={{ 
         display: 'grid', 
         gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
         gap: 16, 
         marginBottom: 24 
       }}>
         <EmployeeStatCard 
            label="รายการทั้งหมด" 
            value={employeeStats.total} 
            icon="📋" 
            gradient="linear-gradient(135deg, #1e293b 0%, #334155 100%)"
            link="/dashboard/incidents?filter=my" 
          />
         <EmployeeStatCard 
            label="กำลังดำเนินการ" 
            value={employeeStats.inProgress} 
            icon="⚙️" 
            gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
            link="/dashboard/incidents?filter=my&status=InProgress" 
          />
         <EmployeeStatCard 
            label="รอฉันยืนยัน" 
            value={employeeStats.pendingConfirm} 
            icon="✍️" 
            gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
            link="/dashboard/incidents?filter=my&status=Pending+Approval" 
          />
         <EmployeeStatCard 
            label="เสร็จสมบูรณ์" 
            value={employeeStats.closed} 
            icon="✅" 
            gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
            link="/dashboard/incidents?filter=my&status=Closed" 
          />
       </div>

       <div className="chart-row" style={{ 
         display: 'grid', 
         gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
         gap: 20, 
         marginBottom: 24 
       }}>
         <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
               📊 สถิติการแจ้งปัญหาของฉัน (6 เดือน)
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={employeeStats.trend}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
               🧩 ประเภทปัญหาที่พบ (Top 5)
            </div>
            {employeeStats.categories?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={employeeStats.categories} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={5}>
                    {employeeStats.categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>ยังไม่มีข้อมูลประเภทปัญหา</div>
            )}
          </div>
       </div>

       <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                📋 รายการแจ้งซ่อมล่าสุดของฉัน
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>ติดตามสถานะการดำเนินการของปัญหาที่คุณแจ้งไว้</div>
            </div>
            <Link href="/dashboard/incidents?filter=my" style={{ 
              fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 700,
              background: '#eff6ff', padding: '8px 16px', borderRadius: 10, transition: 'all 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
              ดูทั้งหมด →
            </Link>
          </div>
          
          <div style={{ padding: '24px' }}>
            {myRecentIncidents.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
                <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>ยังไม่มีรายการแจ้งซ่อมของคุณในขณะนี้</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myRecentIncidents.map(inc => {
                  const statusColor = inc.status === 'Closed' ? '#10b981' : inc.status === 'Pending Approval' ? '#a855f7' : inc.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                  const statusBg = inc.status === 'Closed' ? '#ecfdf5' : inc.status === 'Pending Approval' ? '#f5f3ff' : inc.status === 'In Progress' ? '#eff6ff' : '#fffbeb'
                  
                  return (
                    <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ 
                        padding: '16px 20px', borderRadius: 16, border: '1px solid #f1f5f9', background: '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
                      }} className="activity-card" onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = '#f1f5f9';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                      }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: statusColor }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ 
                            width: 48, height: 48, borderRadius: 12, background: statusBg, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 
                          }}>
                            {inc.status === 'Closed' ? '✅' : inc.status === 'In Progress' ? '⚙️' : '🔔'}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{inc.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>{inc.case_number}</span>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1' }} />
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>แจ้งเมื่อ {formatDate(inc.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: 10, fontWeight: 900, color: statusColor, background: statusBg, 
                            padding: '6px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px',
                            border: `1px solid ${statusColor}22`
                          }}>
                            {inc.status}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>คลิกเพื่อดูรายละเอียด →</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
       </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>
  if (data?.error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาดในการโหลดข้อมูล: {data.error}</div>
  if (!data) return null

  const role = data.userProfile?.role || 'auditor'

  if (role === 'employee') {
    return (
      <div className="dashboard-container" style={{ padding: 'var(--dashboard-padding, 24px)', paddingBottom: 60 }}>
        <style>{`
          :root { --dashboard-padding: 24px; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .dashboard-container { animation: fadeIn 0.4s ease-out; }
          @media (max-width: 768px) {
            :root { --dashboard-padding: 12px; }
            .stat-grid-dynamic { grid-template-columns: 1fr !important; }
            .chart-row { grid-template-columns: 1fr !important; }
            .quick-action-card { padding: 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
            .quick-action-card div:last-child { align-self: stretch !important; justify-content: center !important; }
          }
          * { box-sizing: border-box; }
        `}</style>
        <DashboardHeader pendingApprovalsCount={data.pendingApprovalsCount} myPendingFollowupsCount={data.myPendingFollowupsCount} />
        <EmployeeDashboard data={data} />
      </div>
    )
  }

  const { stats = {}, incidentByDay = [], severityData = [], recentIncidents = [], recentBackups = [] } = data || {}

  const statCards = [
    { label: 'Checklist NG', value: stats.ngChecklistsCount, color: '#ef4444', link: '/dashboard/checklist?filter=ng' },
    { label: 'Incident 30 วัน', value: stats.totalIncidents, color: '#1d4ed8', link: '/dashboard/incidents?date=30days' },
    { label: 'High Severity', value: stats.highSeverity, color: '#dc2626', link: '/dashboard/incidents?severity=High&date=30days' },
    { label: 'รอรับเรื่อง (Open)', value: stats.openIncidents, color: '#2563eb', link: '/dashboard/incidents?status=Open&date=30days' },
    { label: 'กำลังแก้ไข', value: stats.inProgress, color: '#d97706', link: '/dashboard/incidents?status=InProgress&date=30days' },
    { label: 'รออนุมัติ', value: stats.pending, color: '#701a75', link: '/dashboard/incidents?status=Pending+Approval&date=30days' },
  ]

  const ca = data.checklistActions
  const getStreakColor = (status) => {
    switch(status) {
      case 'ok': return '#10b981'; case 'ng': return '#ef4444'; case 'missed': return '#f87171';
      case 'in-progress': return '#facc15'; case 'pending': return '#f59e0b'; case 'skip': return '#e5e7eb';
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
          .main-dashboard-grid { grid-template-columns: 1fr !important; }
          .checklist-status-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 769px) { .main-dashboard-grid { grid-template-columns: 1.6fr 1fr !important; } }
        * { box-sizing: border-box; }
      `}</style>

      <DashboardHeader pendingApprovalsCount={data.pendingApprovalsCount} myPendingFollowupsCount={data.myPendingFollowupsCount} />

      <div className="main-dashboard-grid" style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>IT Checklist Compliance</h2>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>สถานะการตรวจสอบระบบ IT ประจำรอบเวลา</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {ca?.streak?.map((s, idx) => (
                  <Link key={idx} href={`/dashboard/checklist?date=${s.date}`} style={{ textDecoration: 'none' }}>
                    <div 
                      style={{ 
                        width: 22, height: 22, borderRadius: '50%', 
                        background: getStreakColor(s.status), 
                        boxShadow: `0 0 10px ${getStreakColor(s.status)}55`,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.8)'
                      }} 
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.boxShadow = `0 0 15px ${getStreakColor(s.status)}88`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 0 10px ${getStreakColor(s.status)}55`;
                      }}
                      title={`${s.date}: ${s.label}`}
                    >
                      {s.status === 'ng' && '⚠️'}
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {[
                  { label: 'OK', color: '#10b981' },
                  { label: 'NG', color: '#ef4444' },
                  { label: 'In Progress', color: '#facc15' },
                  { label: 'Missed', color: '#f87171' }
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="checklist-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatusCard title="Daily" value={ca?.dailyStatus?.label || 'รอตรวจ'} status={ca?.dailyStatus?.status} />
            <StatusCard title="Weekly" value={ca?.weeklyStatus?.label || 'รอตรวจ'} status={ca?.weeklyStatus?.status} />
            <StatusCard title="Monthly" value={ca?.monthlyStatus?.label || 'รอตรวจ'} status={ca?.monthlyStatus?.status} />
            <StatusCard title="Yearly" value={ca?.yearlyStatus?.label || 'รอตรวจ'} status={ca?.yearlyStatus?.status} />
          </div>
        </div>

        <Link href="/dashboard/reports/sla" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: stats.slaComplianceRateYTD >= 95 
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
              : stats.slaComplianceRateYTD >= 90 
                ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
            borderRadius: 16, 
            padding: 24, 
            color: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: stats.slaComplianceRateYTD >= 95 
              ? '0 10px 20px rgba(16, 185, 129, 0.2)' 
              : stats.slaComplianceRateYTD >= 90 
                ? '0 10px 20px rgba(217, 119, 6, 0.2)' 
                : '0 10px 20px rgba(220, 38, 38, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 100, opacity: 0.1 }}>📉</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>SLA Compliance Rate (YTD)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 42, fontWeight: 900 }}>{stats.slaComplianceRateYTD}%</div>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>/ Target 95%</div>
            </div>
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.2)', height: 8, borderRadius: 10, position: 'relative' }}>
              <div style={{ 
                background: '#fff', 
                height: '100%', 
                borderRadius: 10, 
                width: `${Math.min(stats.slaComplianceRateYTD, 100)}%`,
                boxShadow: '0 0 10px rgba(255,255,255,0.5)'
              }} />
              <div style={{ position: 'absolute', left: '95%', top: -4, bottom: -4, width: '2px', background: 'rgba(255,255,255,0.5)', zIndex: 1 }} title="Target 95%" />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, fontWeight: 600, opacity: 0.9 }}>
              {stats.slaComplianceRateYTD >= 95 ? '✅ บรรลุเป้าหมาย (On Target)' : stats.slaComplianceRateYTD >= 90 ? '⚠️ ต่ำกว่าเป้าหมายเล็กน้อย (Warning)' : '🚨 ต่ำกว่าเกณฑ์ที่กำหนด (Below Target)'}
            </div>
          </div>
        </Link>
      </div>

      <div className="stat-grid-dynamic" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <Link key={s.label} href={s.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Incident 7 วันล่าสุด</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incidentByDay}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Severity Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Incident ล่าสุด (SLA Tracking)</div>
          <Link href="/dashboard/incidents" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Case ID', 'หัวข้อ', 'Severity', 'Status', 'SLA & Time', 'วันที่'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map(inc => {
                const sla = getSLAStatus(inc, data?.wh, data?.holidays)
                return (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 11 }}>{inc.case_number}</td>
                    <td style={{ padding: '10px 16px' }}>{inc.title}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: inc.severity === 'High' ? '#fee2e2' : '#d1fae5', color: inc.severity === 'High' ? '#991b1b' : '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{inc.severity}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: inc.status === 'Closed' ? '#d1fae5' : '#dbeafe', color: inc.status === 'Closed' ? '#065f46' : '#1e40af', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{inc.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: sla.bg, color: sla.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{sla.label}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{formatDate(inc.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
