'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/dateFormat'

const SEVERITY_COLORS = {
  High: { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' },
  Medium: { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
  Low: { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
}

const STATUS_COLORS = {
  Open: { backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' },
  'In Progress': { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  'Pending Approval': { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' },
  Closed: { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [incidentsCache, setIncidentsCache] = useState({}) // SWR Cache
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '30days')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || 'all')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setCurrentUser(profile)
      }
    }
    getUser()
  }, [])

  const isVisitor = currentUser?.role === 'visitor'

  useEffect(() => { 
    setPage(0)
    fetchIncidents(0, false) 
  }, [dateFilter, statusFilter, severityFilter, currentUser?.id])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchIncidents(nextPage, true)
  }

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
    return start.toLocaleDateString('en-CA')
  }

  const fetchIncidents = async (pageToFetch = 0, isLoadMore = false) => {
    const cacheKey = `${dateFilter}-${statusFilter}-${severityFilter}-${pageToFetch}-${currentUser?.id || 'guest'}`
    
    // 1. Stale: Use cache if available
    if (!isLoadMore && incidentsCache[cacheKey]) {
      setIncidents(incidentsCache[cacheKey])
      // Still refresh in background
    } else if (!isLoadMore) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .gte('created_at', getDateRange())
      .order('created_at', { ascending: false })
      .range(pageToFetch * 20, (pageToFetch + 1) * 20 - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter === 'InProgress' ? 'In Progress' : statusFilter)
    }
    if (severityFilter !== 'all') {
      query = query.eq('severity', severityFilter)
    }

    if (currentUser?.role === 'member') {
      query = query.or(`created_by.eq.${currentUser.id},reported_by.eq.${currentUser.email}`)
    }

    const { data, error, count } = await query
    
    if (!error) {
      const freshData = data || []
      if (isLoadMore) {
        setIncidents(prev => [...prev, ...freshData])
      } else {
        setIncidents(freshData)
      }
      
      setHasMore(count > (pageToFetch + 1) * 20)
      
      // Update Cache
      setIncidentsCache(prev => ({ ...prev, [cacheKey]: freshData }))
    }
    
    setLoading(false)
    setLoadingMore(false)
  }

  const stats = {
    total: incidents.length,
    high: incidents.filter(i => i.severity === 'High').length,
    inProgress: incidents.filter(i => i.status === 'In Progress').length,
    pending: incidents.filter(i => i.status === 'Pending Approval').length,
    closed: incidents.filter(i => i.status === 'Closed').length,
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Incident Management</h1>
        {!isVisitor && (
          <Link href="/dashboard/incidents/new" style={{
            background: '#1d4ed8', color: '#fff', padding: '8px 16px',
            borderRadius: 8, fontSize: 13, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            + Add Incident
          </Link>
        )}
      </div>

      <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Incidents', value: stats.total, color: '#1e293b', icon: '📊', bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', sub: 'ที่ตรงเงื่อนไข' },
          { label: 'High Severity', value: stats.high, color: '#dc2626', icon: '🔥', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', sub: 'ต้องดำเนินการทันที' },
          { label: 'Pending Approval', value: stats.pending, color: '#701a75', icon: '✍️', bg: 'linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%)', sub: 'รอเซ็นชื่อ/อนุมัติ' },
          { label: 'Closed', value: stats.closed, color: '#059669', icon: '✅', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', sub: 'เสร็จสิ้น/ปิดงาน' },
        ].map(card => (
          <div key={card.label} style={{ 
            background: card.bg, borderRadius: 16, padding: '20px', border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -5, top: -5, fontSize: 40, opacity: 0.1 }}>{card.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: 500 }}>{card.sub}</div>
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
                padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: dateFilter === f.value ? 'none' : '1px solid #d1d5db',
                background: dateFilter === f.value ? '#1d4ed8' : '#fff',
                color: dateFilter === f.value ? '#fff' : '#374151',
                fontWeight: dateFilter === f.value ? 700 : 400,
                fontFamily: 'inherit',
                transition: 'all 0.2s'
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
            <option value="Pending Approval">Pending Approval</option>
            <option value="Closed">Closed</option>
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
            {!isVisitor && (
              <Link href="/dashboard/incidents/new" style={{ color: '#1d4ed8', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
                + เพิ่ม Incident ใหม่
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontSize: 13 }}>
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
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        ...SEVERITY_COLORS[inc.severity], 
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 
                      }}>
                        {inc.severity === 'High' ? '🔥 ' : inc.severity === 'Medium' ? '⚠️ ' : '🟢 '}
                        {inc.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        ...STATUS_COLORS[inc.status], 
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 
                      }}>
                        {inc.status === 'Closed' ? '✅ ' : inc.status === 'Pending Approval' ? '✍️ ' : inc.status === 'In Progress' ? '⏳ ' : '⚪ '}
                        {inc.status}
                      </span>
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
        
        {hasMore && (
          <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
            <button 
              onClick={loadMore} 
              disabled={loadingMore}
              style={{
                padding: '10px 30px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151',
                cursor: loadingMore ? 'default' : 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => !loadingMore && (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => !loadingMore && (e.currentTarget.style.background = '#fff')}
            >
              {loadingMore ? '⏳ กำลังโหลด...' : '➕ แสดงข้อมูลเพิ่มเติม'}
            </button>
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
