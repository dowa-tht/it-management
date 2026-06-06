'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSLAReportData } from '@/app/actions/reports'
import { formatDate, formatDateNumeric } from '@/lib/dateFormat'
import { formatDurationThai } from '@/lib/slaUtils'

const DATE_FILTERS = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วัน', value: '7days' },
  { label: '30 วัน', value: '30days' },
  { label: 'เดือนนี้', value: 'month' },
  { label: '3 เดือน', value: '3months' },
  { label: 'ปีนี้', value: 'year' },
]

const SEVERITY_COLORS = {
  High: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  Medium: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Low: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
}

const STATUS_COLORS = {
  Open: { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Pending Approval': { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
  Closed: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
}

const toYYYYMMDD = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const r = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${r}`
}

export default function SLAReportPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [activeFilter, setActiveFilter] = useState('30days')
  const [reportCache, setReportCache] = useState({}) // 👈 Cache object for SWR
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    setPage(0)
    fetchData(dateRange.start, dateRange.end, 0, false)
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchData(dateRange.start, dateRange.end, nextPage, true)
  }

  const fetchData = async (overrideStart, overrideEnd, pageToFetch = 0, isLoadMore = false) => {
    const start = overrideStart || dateRange.start
    const end = overrideEnd || dateRange.end
    const cacheKey = `${start}-${end}-${pageToFetch}`

    // 1. Stale: Check cache and display immediately if available
    if (!isLoadMore && reportCache[cacheKey]) {
      setData(reportCache[cacheKey])
      // We don't set loading to true here to avoid flickering (SWR pattern)
    } else if (!isLoadMore) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      // 2. Revalidate: Always fetch fresh data from server
      const res = await getSLAReportData(start, end, pageToFetch)
      
      if (res.success) {
        if (isLoadMore) {
          setData(prev => ({
            ...res,
            data: [...prev.data, ...res.data]
          }))
        } else {
          setData(res)
        }
        
        setHasMore(res.data.length === 20)
        // 3. Update Cache: Store fresh results
        setReportCache(prev => ({ ...prev, [cacheKey]: res }))
      } else {
        const fallback = { data: [], summary: { total: 0, resolved: 0, passed: 0, failed: 0, complianceRate: 0 } }
        if (!isLoadMore) setData(fallback)
        setReportCache(prev => ({ ...prev, [cacheKey]: fallback }))
      }
    } catch (err) {
      console.error('SWR Fetch Error:', err)
    }
    setLoading(false)
    setLoadingMore(false)
  }

  const applyQuickFilter = (type) => {
    setActiveFilter(type)
    const now = new Date()
    const start = new Date()
    if (type === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (type === '7days') {
      start.setDate(now.getDate() - 7)
    } else if (type === '30days') {
      start.setDate(now.getDate() - 30)
    } else if (type === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    } else if (type === '3months') {
      start.setMonth(now.getMonth() - 3)
    } else if (type === 'year') {
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    }
    const newRange = {
      start: toYYYYMMDD(start),
      end: toYYYYMMDD(now)
    }
    setDateRange(newRange)
    setPage(0)
    fetchData(newRange.start, newRange.end, 0, false)
  }

  const calculateDiffMinutes = (start, end) => {
    try {
      const [h1, m1] = start.split(':').map(Number)
      const [h2, m2] = end.split(':').map(Number)
      return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1))
    } catch (e) { return 0 }
  }

  // SLA Guide Modal — read-only, edit settings ที่ /dashboard/settings/sla
  const SLAGuideModal = () => {
    const settings = data?.settings || {
      working_hours: { start: '08:30', end: '17:30' },
      sla_limits: { High: 240, Medium: 480, Low: 1620, Response: { High: 60, Medium: 120, Low: 360 } }
    }
    if (!settings.sla_limits.Response) {
      settings.sla_limits.Response = { High: 60, Medium: 120, Low: 360 }
    }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px 30px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>📊 เกณฑ์การคำนวณ SLA Compliance</h2>
            <button data-readonly-allowed="true" onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
          </div>

          <div style={{ padding: 30 }}>
            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1d4ed8', marginBottom: 12 }}>1. เรานับเวลาอย่างไร? (Working Hours)</h3>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                ระบบจะนับเวลาเฉพาะ <strong>ช่วงเวลาทำการจริง (Business Hours)</strong> เท่านั้น
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12 }}>
                  <strong>🕒 เวลาทำการ:</strong><br />
                  {`${settings.working_hours.start} - ${settings.working_hours.end} น. (จันทร์ - ศุกร์)`}
                </div>
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: 12 }}>
                  <strong>🚫 ข้ามการนับเวลา:</strong><br />วันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์
                </div>
              </div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1d4ed8', marginBottom: 12 }}>2. เป้าหมายรายดัชนี (SLA Targets)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 0' }}>Severity</th>
                    <th style={{ padding: '8px 0' }}>Response</th>
                    <th style={{ padding: '8px 0' }}>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'High', label: '🔴 High', color: '#dc2626' },
                    { key: 'Medium', label: '🟡 Medium', color: '#d97706' },
                    { key: 'Low', label: '🟢 Low', color: '#059669' }
                  ].map(item => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 0' }}><span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span></td>
                      <td style={{ padding: '10px 0', fontWeight: 600, color: '#0f172a' }}>{formatDurationThai(settings.sla_limits.Response?.[item.key] || 0)}</td>
                      <td style={{ padding: '10px 0', fontWeight: 600, color: '#0f172a' }}>{formatDurationThai(settings.sla_limits[item.key] || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>💡 ตัวอย่างการคำนวณแบบแยกดัชนี</h3>
              <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.6 }}>
                <div>• <strong>Response:</strong> นับจากเวลาเปิดเคส จนถึงเวลาที่ IT กด "รับเรื่อง"</div>
                <div>• <strong>Resolution:</strong> นับจากเวลาเปิดเคส จนถึงเวลาที่แก้ไขเสร็จ (หักช่วงเวลา Exclusion)</div>
                <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, fontSize: 11 }}>
                  <strong>Dashboard Score:</strong> (Response % + Resolution %) / 2
                </div>
              </div>
            </section>

            <div style={{ marginTop: 8, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/dashboard/settings/sla"
                onClick={() => setShowHelp(false)}
                style={{ padding: '10px 20px', background: '#f8fafc', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                ⚙️ ไปที่ SLA Settings
              </Link>
              <button data-readonly-allowed="true" onClick={() => setShowHelp(false)} style={{ padding: '10px 30px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>เข้าใจแล้ว</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (passed) => {
    if (passed === null) return { bg: '#f3f4f6', color: '#6b7280' }
    return passed ? { bg: '#d1fae5', color: '#065f46' } : { bg: '#fee2e2', color: '#991b1b' }
  }

  const summary = data?.summary || { total: 0, resolved: 0, acknowledged: 0, responseRate: 0, resolutionRate: 0, complianceRate: 0 }
  const incidents = data?.data || []

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .table-scroll { overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; }
        .sla-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .sla-table th { padding: 12px 20px; text-align: left; color: #6b7280; font-weight: 500; fontSize: 11px; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; background: #f9fafb; white-space: nowrap; }
        .sla-table td { padding: 14px 20px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .action-cell { width: 80px; min-width: 80px; text-align: right; white-space: nowrap; }
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      
      {showHelp && <SLAGuideModal />}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0' }}>SLA Compliance Dashboard</h1>
            <button 
              data-readonly-allowed="true"
              onClick={() => setShowHelp(true)}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '50%', width: 20, height: 20, fontSize: 12, color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginTop: 4 }}
              title="ดูเกณฑ์การคำนวณ SLA"
            >
              ?
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>วิเคราะห์ประสิทธิภาพการตอบสนองและการแก้ไขปัญหา</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>ช่วงเวลา (DATE RANGE)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DATE_FILTERS.map(f => (
                <button data-readonly-allowed="true" key={f.value} onClick={() => applyQuickFilter(f.value)} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: activeFilter === f.value ? 'none' : '1px solid #d1d5db',
                  background: activeFilter === f.value ? '#1d4ed8' : '#fff',
                  color: activeFilter === f.value ? '#fff' : '#374151',
                  fontWeight: activeFilter === f.value ? 700 : 400,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>กำหนดเอง (CUSTOM)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
                <input data-readonly-allowed="true" type="date" value={dateRange.start} onChange={e => { setActiveFilter('custom'); setDateRange({ ...dateRange, start: e.target.value }) }}
                onClick={(e) => { try { e.target.showPicker() } catch(err) {} }}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2, color: 'transparent', background: 'transparent' }} 
              />
              <div style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 130, gap: 10 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{formatDateNumeric(dateRange.start)}</span>
                <span style={{ fontSize: 14, color: '#6b7280' }}>📅</span>
              </div>
            </div>
            <span style={{ color: '#9ca3af', fontWeight: 500 }}>—</span>
            <div style={{ position: 'relative' }}>
              <input data-readonly-allowed="true" type="date" value={dateRange.end} onChange={e => { setActiveFilter('custom'); setDateRange({ ...dateRange, end: e.target.value }) }}
                onClick={(e) => { try { e.target.showPicker() } catch(err) {} }}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2, color: 'transparent', background: 'transparent' }} 
              />
              <div style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 130, gap: 10 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{formatDateNumeric(dateRange.end)}</span>
                <span style={{ fontSize: 14, color: '#6b7280' }}>📅</span>
              </div>
            </div>
          </div>
        </div>

        <button data-readonly-allowed="true" onClick={() => { setPage(0); fetchData(dateRange.start, dateRange.end, 0, false); }} disabled={loading} style={{ padding: '8px 20px', background: loading ? '#93c5fd' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', height: 35, display: 'flex', alignItems: 'center' }}>
          {loading ? 'กำลังโหลด...' : 'กรองข้อมูล'}
        </button>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ 
          background: summary.complianceRate >= 95 
            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
            : summary.complianceRate >= 90 
              ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
              : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
          borderRadius: 16, 
          padding: 24, 
          color: '#fff', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
          position: 'relative', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 60, opacity: 0.15 }}>📊</div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>Compliance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <div style={{ fontSize: 36, fontWeight: 900 }}>{summary.complianceRate}%</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Target: 95%</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>RESPONSE</div>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 900, 
            color: summary.responseRate >= 95 ? '#059669' : summary.responseRate >= 90 ? '#d97706' : '#dc2626' 
          }}>
            {summary.responseRate}%
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>Target: 95%</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>RESOLUTION</div>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 900, 
            color: summary.resolutionRate >= 95 ? '#059669' : summary.resolutionRate >= 90 ? '#d97706' : '#dc2626' 
          }}>
            {summary.resolutionRate}%
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>Target: 95%</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL CASES</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#1e293b' }}>{summary.total}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>Incident Reported</div>
        </div>
      </div>

      {!loading && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            Incident List & Performance Details
          </div>
          <div className="table-scroll">
            <table className="sla-table">
              <thead>
                <tr>
                  {['Case ID', 'Title', 'Severity', 'Status', 'Date', 'Response SLA', 'Resolution SLA', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล Incident ในช่วงเวลาที่เลือก</td></tr>
                ) : incidents.map(inc => {
                  const sev = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.Low;
                  const stat = STATUS_COLORS[inc.status] || STATUS_COLORS.Open;
                  
                  return (
                    <tr key={inc.id}>
                      <td style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
                        <div style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: 11, fontWeight: 600 }}>{inc.case_number}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13, marginBottom: 2 }}>{inc.title}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{inc.affected_system || 'General'}</div>
                      </td>
                      <td>
                        <span style={{ 
                          background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
                        }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          background: stat.bg, color: stat.color, border: `1px solid ${stat.border}`,
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
                        }}>
                          {inc.status}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {formatDateNumeric(inc.created_at)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {inc.responseMin !== null ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: inc.isResponseOK ? '#059669' : '#dc2626' }}>
                                {formatDurationThai(inc.responseMin)}
                              </span>
                              <span style={{ 
                                background: inc.isResponseOK ? '#d1fae5' : '#fee2e2', 
                                color: inc.isResponseOK ? '#065f46' : '#991b1b',
                                padding: '1px 4px', borderRadius: 4, fontSize: 9, fontWeight: 800
                              }}>
                                {inc.isResponseOK ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Target: {formatDurationThai(inc.responseLimit)}</div>
                          </div>
                        ) : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 11 }}>N/A</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {inc.resolveMin !== null ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: inc.isResolveOK ? '#059669' : '#dc2626' }}>
                                {formatDurationThai(inc.resolveMin)}
                              </span>
                              <span style={{ 
                                background: inc.isResolveOK ? '#d1fae5' : '#fee2e2', 
                                color: inc.isResolveOK ? '#065f46' : '#991b1b',
                                padding: '1px 4px', borderRadius: 4, fontSize: 9, fontWeight: 800
                              }}>
                                {inc.isResolveOK ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Target: {formatDurationThai(inc.resolveLimit)}</div>
                          </div>
                        ) : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 11 }}>N/A</span>}
                      </td>
                      <td className="action-cell">
                        <Link href={`/dashboard/incidents/${inc.id}`} style={{ 
                          padding: '6px 12px', background: '#fff', color: '#1d4ed8', 
                          textDecoration: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, 
                          border: '1px solid #d1d5db', transition: 'all 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}>
                          เปิดดู
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
              <button 
                data-readonly-allowed="true"
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
      )}
    </div>
  )
}
