'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function DashboardPage() {
  const [incidents, setIncidents] = useState([])
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)

    const [{ data: inc }, { data: bak }] = await Promise.all([
      supabase.from('incidents').select('*').gte('created_at', start.toISOString()).order('created_at', { ascending: false }),
      supabase.from('backup_logs').select('*').gte('log_date', start.toISOString().split('T')[0]).order('log_date', { ascending: false })
    ])

    setIncidents(inc || [])
    setBackups(bak || [])
    setLoading(false)
  }

  // Chart data
  const incidentByDay = () => {
    const map = {}
    incidents.forEach(i => {
      const d = new Date(i.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      map[d] = (map[d] || 0) + 1
    })
    return Object.entries(map).slice(-7).map(([date, count]) => ({ date, count }))
  }

  const severityData = [
    { name: 'High', value: incidents.filter(i => i.severity === 'High').length, color: '#ef4444' },
    { name: 'Medium', value: incidents.filter(i => i.severity === 'Medium').length, color: '#f59e0b' },
    { name: 'Low', value: incidents.filter(i => i.severity === 'Low').length, color: '#10b981' },
  ].filter(d => d.value > 0)

  const backupSuccessRate = backups.length
    ? Math.round((backups.filter(b => b.status === 'Success').length / backups.length) * 100)
    : 0

  const stats = [
    { label: 'Incident เดือนนี้', value: incidents.length, color: '#1d4ed8', link: '/dashboard/incidents' },
    { label: 'High Severity', value: incidents.filter(i => i.severity === 'High').length, color: '#dc2626', link: '/dashboard/incidents' },
    { label: 'กำลังแก้ไข', value: incidents.filter(i => i.status === 'In Progress').length, color: '#d97706', link: '/dashboard/incidents' },
    { label: 'Backup Success Rate', value: `${backupSuccessRate}%`, color: '#059669', link: '/dashboard/backup' },
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Dashboard</h1>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <Link key={s.label} href={s.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '16px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Bar Chart */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Incident 7 วันล่าสุด</div>
          {incidentByDay().length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentByDay()}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
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

        {/* Pie Chart */}
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

      {/* Recent Incidents */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Incident ล่าสุด</div>
          <Link href="/dashboard/incidents" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>
        {incidents.slice(0, 5).length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>ยังไม่มี Incident</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Case ID', 'หัวข้อ', 'Severity', 'Status', 'วันที่'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 5).map(inc => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#6b7280', fontSize: 11 }}>{inc.case_number}</td>
                  <td style={{ padding: '10px 16px', color: '#111827' }}>{inc.title}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: inc.severity === 'High' ? '#fee2e2' : inc.severity === 'Medium' ? '#fef3c7' : '#d1fae5', color: inc.severity === 'High' ? '#991b1b' : inc.severity === 'Medium' ? '#92400e' : '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                      {inc.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: inc.status === 'Open' ? '#dbeafe' : inc.status === 'In Progress' ? '#fef3c7' : '#d1fae5', color: inc.status === 'Open' ? '#1e40af' : inc.status === 'In Progress' ? '#92400e' : '#065f46', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                      {inc.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>
                    {new Date(inc.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Backup */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Backup Log ล่าสุด</div>
          <Link href="/dashboard/backup" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>
        {backups.slice(0, 5).length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>ยังไม่มีข้อมูล Backup</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['วันที่', 'ระบบ', 'สถานะ', 'หมายเหตุ'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.slice(0, 5).map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>{new Date(b.log_date).toLocaleDateString('th-TH')}</td>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>{b.system_name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: b.status === 'Success' ? '#d1fae5' : b.status === 'Failed' ? '#fee2e2' : '#f3f4f6', color: b.status === 'Success' ? '#065f46' : b.status === 'Failed' ? '#991b1b' : '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280' }}>{b.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}