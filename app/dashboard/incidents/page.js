'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/dateFormat'

const SEVERITY_COLORS = {
  High: { bg: '#fee2e2', color: '#991b1b' },
  Medium: { bg: '#fef3c7', color: '#92400e' },
  Low: { bg: '#d1fae5', color: '#065f46' },
}

const STATUS_COLORS = {
  Open: { bg: '#dbeafe', color: '#1e40af' },
  'In Progress': { bg: '#fef3c7', color: '#92400e' },
  Resolved: { bg: '#d1fae5', color: '#065f46' },
}

const DATE_FILTERS = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วัน', value: '7days' },
  { label: '30 วัน', value: '30days' },
  { label: 'เดือนนี้', value: 'month' },
  { label: '3 เดือน', value: '3months' },
  { label: 'ปีนี้', value: 'year' },
]

function IncidentsContent() {
  const searchParams = useSearchParams()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'month')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || 'all')

  useEffect(() => { fetchIncidents() }, [dateFilter, statusFilter, severityFilter])

  const getDateRange = () => {
    const now = new Date()
    const start = new Date()
    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (dateFilter === '7days') {
      start.setDate(now.getDate() - 7)
    } else if (dateFilter === '30days') {
      start.setDate(now.getDate() - 30)
    } else if (dateFilter === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    } else if (dateFilter === '3months') {
      start.setMonth(now.getMonth() - 3)
    } else if (dateFilter === 'year') {
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    }
    return start.toISOString()
  }

  const fetchIncidents = async () => {
    setLoading(true)
    let query = supabase
      .from('incidents')
      .select('*')
      .gte('created_at', getDateRange())
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter === 'InProgress' ? 'In Progress' : statusFilter)
    }
    if (severityFilter !== 'all') {
      query = query.eq('severity', severityFilter)
    }

    const { data, error } = await query
    if (!error) setIncidents(data || [])
    setLoading(false)
  }

  const stats = {
    total: incidents.length,
    high: incidents.filter(i => i.severity === 'High').length,
    inProgress: incidents.filter(i => i.status === 'In Progress').length,
    resolved: incidents.filter(i => i.status === 'Resolved').length,
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Incident Management</h1>
        <Link href="/dashboard/incidents/new" style={{
          background: '#1d4ed8', color: '#fff', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          + Add Incident
        </Link>
      </div>

      <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Incidents', value: stats.total, color: '#111827', sub: 'ที่ตรงเงื่อนไข' },
          { label: 'High Severity', value: stats.high, color: '#dc2626', sub: 'ต้องดำเนินการทันที' },
          { label: 'In Progress', value: stats.inProgress, color: '#d97706', sub: 'กำลังแก้ไข' },
          { label: 'Resolved', value: stats.resolved, color: '#059669', sub: 'ปิดเคสแล้ว' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>ช่วงเวลา (Date Range)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DATE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setDateFilter(f.value)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: dateFilter === f.value ? 'none' : '1px solid #d1d5db',
                background: dateFilter === f.value ? '#1d4ed8' : '#fff',
                color: dateFilter === f.value ? '#fff' : '#374151', fontFamily: 'inherit'
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>สถานะ (Status)</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid #d1d5db', outline: 'none', fontFamily: 'inherit', width: 140
          }}>
            <option value="all">ทั้งหมด (All)</option>
            <option value="Open">Open</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>ความรุนแรง (Severity)</div>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid #d1d5db', outline: 'none', fontFamily: 'inherit', width: 140
          }}>
            <option value="all">ทั้งหมด (All)</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
          รายการ Incident ({incidents.length} รายการ)
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>กำลังโหลด...</div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            ไม่พบข้อมูลตามเงื่อนไขที่เลือก<br />
            <Link href="/dashboard/incidents/new" style={{ color: '#1d4ed8', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
              + เพิ่ม Incident ใหม่
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Case ID', 'หัวข้อ / ระบบ', 'Severity', 'Status', 'วันที่', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{inc.case_number}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{inc.title}</div>
                      {inc.affected_system && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{inc.affected_system}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...SEVERITY_COLORS[inc.severity], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{inc.severity}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...STATUS_COLORS[inc.status], padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{inc.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(inc.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <Link href={`/dashboard/incidents/${inc.id}`} style={{ color: '#1d4ed8', fontSize: 12, textDecoration: 'none' }}>ดูรายละเอียด →</Link>
                    </td>
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

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดหน้าจอ...</div>}>
      <IncidentsContent />
    </Suspense>
  )
}
