'use client'

const toYYYYMMDD = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const r = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${r}`
}
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/dateFormat'
import { getNextNo } from '@/lib/noSeries'
// Removed static CHECKLIST_TEMPLATES import; will fetch templates from DB only
// const CHECKLIST_TEMPLATES = {} // placeholder to avoid reference errors
import { recordLog } from '@/app/actions/workflow'
import ViewToggle from '@/components/ViewToggle'
import WorkflowMiniProgress from '@/components/workflow/WorkflowMiniProgress'
import { resolveChecklistQr } from '@/app/actions/target'
import { usePageAutoRefresh } from '@/lib/usePageAutoRefresh'

const DATE_FILTERS = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วัน', value: '7days' },
  { label: '30 วัน', value: '30days' },
  { label: 'เดือนนี้', value: 'month' },
  { label: '3 เดือน', value: '3months' },
  { label: 'ปีนี้', value: 'year' },
]

function ChecklistCard({ doc, steps = [] }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (doc.progress / 100) * circumference

  return (
    <Link href={`/dashboard/checklist/${doc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: '20px', 
        padding: '24px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        cursor: 'pointer',
        position: 'relative'
      }}
      className="card-hover"
      >
        <style>{`
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            border-color: #3b82f6;
          }
        `}</style>

        {doc.ng_count > 0 && (
          <div style={{ 
            position: 'absolute', top: '16px', right: '16px',
            background: '#fee2e2', color: '#dc2626', padding: '4px 10px',
            borderRadius: '10px', fontSize: '11px', fontWeight: 800,
            border: '1px solid #fca5a5', zIndex: 2
          }}>
            ⚠️ {doc.ng_count} NG
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              <circle 
                cx="35" cy="35" r={radius} fill="transparent" stroke={doc.progress === 100 ? '#10b981' : '#3b82f6'} 
                strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
              {doc.progress}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{doc.freq_type}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{doc.doc_no}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(doc.period_date)}</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px', color: '#64748b', fontWeight: 600 }}>
            <span>Approval Progress</span>
            <span style={{ 
              color: doc.displayStatus === 'Closed' ? '#10b981' : doc.displayStatus === 'Cancelled' ? '#dc2626' : (doc.displayStatus === 'Pending Approval' ? '#f59e0b' : '#3b82f6'),
              fontWeight: 700
            }}>
              {doc.displayStatus}
            </span>
          </div>
          <WorkflowMiniProgress steps={steps} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
          <span>โดย: {doc.created_by?.split('@')[0]}</span>
          <span>{formatDate(doc.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function ChecklistListForm() {
  const [docs, setDocs] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [docsCache, setDocsCache] = useState({}) // SWR Cache
  const [viewMode, setViewMode] = useState('list')
  const [workflowMap, setWorkflowMap] = useState({})
  const [activeFilter, setActiveFilter] = useState('') 
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [userEmail, setUserEmail] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState({
    freq_type: searchParams.get('freq_type') || '',
    status: '',
    date_from: '',
    date_to: '',
    only_ng: searchParams.get('filter') === 'ng'
  })
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email)
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          setCurrentUser(profile)
        })
      }
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase
      .from('checklist_templates')
      .select('id, freq_type, item_key, item_label, category, ui_template_type, template_config, instruction, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!isMounted || error) return
        setTemplates(data || [])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const isAuditor = currentUser?.role === 'auditor' || currentUser?.role === 'visitor'

  // Sync filters with URL params
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      freq_type: searchParams.get('freq_type') || '',
      only_ng: searchParams.get('filter') === 'ng'
    }))
  }, [searchParams])

  // Trigger fetch when filters change
  useEffect(() => {
    setPage(0)
    fetchDocs(0, false)
  }, [filters.freq_type, filters.status, filters.date_from, filters.date_to, filters.only_ng, currentUser?.id])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchDocs(nextPage, true)
  }

  const applyQuickFilter = (type) => {
    const now = new Date()
    const start = new Date()
    if (type === 'today') {
      start.setHours(0,0,0,0)
    } else if (type === '7days') {
      start.setDate(now.getDate() - 7)
    } else if (type === '30days') {
      start.setDate(now.getDate() - 30)
    } else if (type === 'month') {
      start.setDate(1)
      start.setHours(0,0,0,0)
    } else if (type === '3months') {
      start.setMonth(now.getMonth() - 3)
    } else if (type === 'year') {
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0,0,0,0)
    }
    setActiveFilter(type)
    setFilters({
      ...filters,
      date_from: toYYYYMMDD(start),
      date_to: toYYYYMMDD(now)
    })
  }


  const fetchDocs = async (pageToFetch = 0, isLoadMore = false, forceFresh = false) => {
    const cacheKey = `${filters.freq_type}-${filters.status}-${filters.date_from}-${filters.date_to}-${filters.only_ng}-${pageToFetch}-${currentUser?.id || 'auditor'}`
    
    if (!isLoadMore && docsCache[cacheKey] && !forceFresh) {
      setDocs(docsCache[cacheKey])
    } else if (!isLoadMore) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    let query = supabase
      .from('checklist_docs')
      .select('*', { count: 'exact' })
    
    if (filters.freq_type) query = query.eq('freq_type', filters.freq_type)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.date_from) query = query.gte('period_date', filters.date_from)
    if (filters.date_to) query = query.lte('period_date', filters.date_to)

    const { data, error, count } = await query
      .order('doc_no', { ascending: false })
      .range(pageToFetch * 20, (pageToFetch + 1) * 20 - 1)
    
    if (!error && data) {
      // Fetch stats for these docs
      const docIds = data.map(d => d.id)
      if (docIds.length > 0) {
        const { data: itemData } = await supabase
          .from('checklist_items')
          .select('doc_id, status')
          .in('doc_id', docIds)
        
        const stats = {}
        itemData?.forEach(item => {
          if (!stats[item.doc_id]) stats[item.doc_id] = { total: 0, done: 0, ng: 0 }
          stats[item.doc_id].total += 1
          if (item.status === 'OK' || item.status === 'NG') stats[item.doc_id].done += 1
          if (item.status === 'NG') stats[item.doc_id].ng += 1
        })
        
        let processedDocs = data.map(d => {
          const s = stats[d.id] || { total: 0, done: 0, ng: 0 }
          const progress = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
          
          let displayStatus = d.status
          if (d.status === 'Open' && s.done > 0) displayStatus = 'In Progress'

          return { 
            ...d, 
            ng_count: s.ng,
            progress,
            total_items: s.total,
            done_items: s.done,
            displayStatus
          }
        })
        
        if (filters.only_ng) {
          processedDocs = processedDocs.filter(d => d.ng_count > 0)
        }
        
        if (isLoadMore) {
          setDocs(prev => [...prev, ...processedDocs])
        } else {
          setDocs(processedDocs)
        }
        
        setHasMore(count > (pageToFetch + 1) * 20)
        setDocsCache(prev => ({ ...prev, [cacheKey]: processedDocs }))

        // Fetch Workflow Steps for these documents
        const { data: steps } = await supabase
          .from('document_approvals')
          .select('*')
          .in('doc_id', docIds)
          .order('step_order', { ascending: true })
        
        const map = {}
        steps?.forEach(s => {
          if (!map[s.doc_id]) map[s.doc_id] = []
          map[s.doc_id].push(s)
        })
        setWorkflowMap(prev => ({ ...prev, ...map }))
      } else {
        if (!isLoadMore) setDocs([])
        setHasMore(false)
      }
    }
    setLoading(false)
    setLoadingMore(false)
  }

  usePageAutoRefresh({
    enabled: !!currentUser,
    intervalMs: 90000,
    minIntervalMs: 10000,
    refreshOnFocus: false,
    onRefresh: async () => {
      setPage(0)
      await fetchDocs(0, false, true)
    },
  })

  const handleQrResolve = async (qrValue) => {
    setLoading(true)
    try {
      const res = await resolveChecklistQr(qrValue)
      if (res.success) {
        router.push(res.redirectUrl)
      } else {
        alert(res.error || 'ไม่พบข้อมูลจาก QR นี้')
        setLoading(false)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการตรวจสอบ QR')
      setLoading(false)
    }
  }

  const handleCreate = async (freqType) => {
    setShowCreate(true)
  }


  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>IT Checklist Documents</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>แบบฟอร์มตรวจสอบระบบรายวัน/สัปดาห์</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          
          <button 
            onClick={() => {
              const qr = prompt('สแกน QR Code หรือระบุรหัส (Target QR หรือ TargetQR#PointID)')
              if (qr) handleQrResolve(qr)
            }}
            style={{
              background: '#f8fafc', color: '#1e40af', padding: '10px 16px',
              borderRadius: 12, fontSize: 13, border: '1px solid #bfdbfe', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
          >
            📸 Scan / Search QR
          </button>

          {!isAuditor && (
            <button 
              onClick={() => setShowCreate(true)}
              style={{
                background: '#1d4ed8', color: '#fff', padding: '10px 24px',
                borderRadius: 12, fontSize: 13, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600,
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)'
              }}>
              + สร้างเอกสารใหม่
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateChecklistModal
          userEmail={userEmail}
          userId={currentUser?.id}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            router.push(`/dashboard/checklist/${id}`)
          }}
        />
      )}

      {/* Filters Bar */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>ช่วงเวลา (DATE RANGE)</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {DATE_FILTERS.map(f => (
              <button 
                data-readonly-allowed="true"
                key={f.value} 
                onClick={() => applyQuickFilter(f.value)} 
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: activeFilter === f.value ? 'none' : '1px solid #d1d5db',
                  background: activeFilter === f.value ? '#1d4ed8' : '#fff',
                  color: activeFilter === f.value ? '#fff' : '#374151',
                  fontWeight: activeFilter === f.value ? 700 : 400,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  height: 28
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', color: filters.date_from ? '#111827' : '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 33 }}>
                <span>{filters.date_from ? formatDate(filters.date_from, false).replaceAll('-', '/') : 'dd/mm/yyyy'}</span>
                <span style={{ fontSize: 12 }}>📅</span>
              </div>
              <input 
                data-readonly-allowed="true"
                type="date" 
                value={filters.date_from} 
                onClick={(e) => { try { e.target.showPicker() } catch(err) {} }}
                onChange={e => {
                  setFilters({...filters, date_from: e.target.value})
                  setActiveFilter('')
                }} 
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', color: 'transparent', background: 'transparent' }} 
              />
            </div>
            <span style={{ color: '#9ca3af' }}>-</span>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', color: filters.date_to ? '#111827' : '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 33 }}>
                <span>{filters.date_to ? formatDate(filters.date_to, false).replaceAll('-', '/') : 'dd/mm/yyyy'}</span>
                <span style={{ fontSize: 12 }}>📅</span>
              </div>
              <input 
                data-readonly-allowed="true"
                type="date" 
                value={filters.date_to} 
                onClick={(e) => { try { e.target.showPicker() } catch(err) {} }}
                onChange={e => {
                  setFilters({...filters, date_to: e.target.value})
                  setActiveFilter('')
                }} 
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', color: 'transparent', background: 'transparent' }} 
              />
            </div>
          </div>
        </div>
        
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>ประเภท</label>
          <select data-readonly-allowed="true" value={filters.freq_type} onChange={e => setFilters({...filters, freq_type: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="">ทั้งหมด</option>
            {/* Frequency filter options derived from fetched templates */}
            {Array.from(new Set((templates||[]).map(t=>t.freq_type))).sort().map(f=>(
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>สถานะ</label>
          <select data-readonly-allowed="true" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="">ทั้งหมด</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ paddingBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: filters.only_ng ? '#dc2626' : '#374151', fontWeight: filters.only_ng ? 600 : 400 }}>
            <input data-readonly-allowed="true" type="checkbox" checked={filters.only_ng} onChange={e => setFilters({...filters, only_ng: e.target.checked})} style={{ width: 16, height: 16 }} />
            แสดงเฉพาะที่มีปัญหา (NG)
          </label>
        </div>

        <button data-readonly-allowed="true" onClick={() => setFilters({ freq_type: '', status: '', date_from: '', date_to: '', only_ng: false })} style={{ padding: '8px 16px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer', marginBottom: 2 }}>
          ล้างฟิลเตอร์
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
          <span>ประวัติเอกสาร ({docs.length} รายการ)</span>
          {filters.only_ng && <span style={{ color: '#dc2626', fontSize: 11 }}>กำลังกรอง: พบปัญหา (NG)</span>}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>กำลังโหลด...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            ไม่พบเอกสารตามเงื่อนไขที่เลือก
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: 20, 
            padding: 16,
            background: '#f8fafc'
          }}>
            {docs.map(doc => (
              <ChecklistCard key={doc.id} doc={doc} steps={workflowMap[doc.id] || []} />
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['เลขที่เอกสาร', 'ประเภท', 'วันที่ตรวจสอบ', 'Progress', 'Workflow', 'สถานะ', 'ปัญหา (NG)', 'ผู้สร้าง', 'วันที่สร้าง'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#1d4ed8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <Link href={`/dashboard/checklist/${doc.id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                        {doc.doc_no}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>{doc.freq_type}</td>
                    <td style={{ padding: '12px 16px', color: '#111827' }}>{formatDate(doc.period_date)}</td>
                    <td style={{ padding: '12px 16px', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, background: '#e5e7eb', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ background: doc.progress === 100 ? '#10b981' : '#3b82f6', height: '100%', width: `${doc.progress}%` }}></div>
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280', width: 28, textAlign: 'right' }}>{doc.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 150 }}>
                      <WorkflowMiniProgress steps={workflowMap[doc.id] || []} currentStatus={doc.status} />
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase' }}>
                        {workflowMap[doc.id]?.find(s => s.status === 'pending')?.role_required || (doc.status === 'Closed' ? 'Completed' : 'Wait Resolve')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        background: doc.displayStatus === 'Cancelled' ? '#fee2e2' : doc.displayStatus === 'In Progress' ? '#eff6ff' : doc.displayStatus === 'Pending Approval' ? '#ffedd5' : doc.displayStatus === 'Open' ? '#f3f4f6' : '#ecfdf5', 
                        color: doc.displayStatus === 'Cancelled' ? '#dc2626' : doc.displayStatus === 'In Progress' ? '#1d4ed8' : doc.displayStatus === 'Pending Approval' ? '#9a3412' : doc.displayStatus === 'Open' ? '#4b5563' : '#059669', 
                        border: `1px solid ${doc.displayStatus === 'Cancelled' ? '#fca5a5' : doc.displayStatus === 'In Progress' ? '#bfdbfe' : doc.displayStatus === 'Pending Approval' ? '#fed7aa' : doc.displayStatus === 'Open' ? '#e5e7eb' : '#a7f3d0'}`,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 
                      }}>
                        {doc.displayStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {doc.ng_count > 0 ? (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#fee2e2', color: '#dc2626', padding: '3px 8px', 
                          borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #fca5a5' 
                        }}>
                          <span>⚠️</span>
                          <span>{doc.ng_count} NG</span>
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{doc.created_by}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(doc.created_at)}
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
    </div>
  )
}


// ==========================================
// Modal: CreateChecklistModal
// ==========================================
function CreateChecklistModal({ userEmail, userId, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [freq, setFreq] = useState('Daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let isMounted = true

    supabase
      .from('checklist_templates')
      .select('id, freq_type, item_key, item_label, category, ui_template_type, template_config, instruction, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!isMounted || error) return
        setTemplates(data || [])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const getPeriodRange = (dateStr, freqType) => {
    const d = new Date(dateStr)
    if (freqType === 'Daily') return { start: dateStr, end: dateStr }
    if (freqType === 'Monthly') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      return { start, end }
    }
    if (freqType === 'Yearly') {
      const start = `${d.getFullYear()}-01-01`
      const end = `${d.getFullYear()}-12-31`
      return { start, end }
    }
    if (freqType === 'Weekly') {
      const day = d.getDay() || 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - day + 1)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { 
        start: monday.toISOString().split('T')[0], 
        end: sunday.toISOString().split('T')[0] 
      }
    }
    return { start: dateStr, end: dateStr }
  }

  const fetchAvailableItems = async () => {
    setLoading(true)
    const range = getPeriodRange(date, freq)
    
    // 1. Get all templates for freq
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('freq_type', freq)
      .eq('is_active', true)
      .order('sort_order')

    // 2. Find items already in documents for this period
    const { data: periodDocs } = await supabase
      .from('checklist_docs')
      .select('id')
      .eq('freq_type', freq)
      .gte('period_date', range.start)
      .lte('period_date', range.end)

    const docIds = periodDocs?.map(d => d.id) || []
    let usedItems = []
    if (docIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('checklist_items')
        .select('item_key')
        .in('doc_id', docIds)
      usedItems = itemsData || []
    }

    const usedKeys = new Set(usedItems?.map(i => i.item_key) || [])
    const available = (templates || []).map(t => ({
      ...t,
      selection_key: t.id || `${t.item_key || 'template'}-${t.freq_type || 'freq'}-${t.item_label || 'label'}`,
      isUsed: usedKeys.has(t.item_key)
    }))

    setItems(available)
    setSelectedTemplateIds(available.filter(t => !t.isUsed).map(t => t.selection_key))
    setLoading(false)
    setStep(2)
  }

  const handleFinalCreate = async () => {
    if (selectedTemplateIds.length === 0) return
    setCreating(true)

    // Re-verify that the selected items are not already used by another user in this period
    const range = getPeriodRange(date, freq)
    const { data: periodDocs } = await supabase
      .from('checklist_docs')
      .select('id')
      .eq('freq_type', freq)
      .gte('period_date', range.start)
      .lte('period_date', range.end)

    const docIds = periodDocs?.map(d => d.id) || []
    let usedKeys = new Set()
    if (docIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('checklist_items')
        .select('item_key')
        .in('doc_id', docIds)
      usedKeys = new Set(itemsData?.map(i => i.item_key) || [])
    }

    const selectedTemplates = items.filter(t => selectedTemplateIds.includes(t.selection_key))
    const duplicateTemplates = selectedTemplates.filter(t => usedKeys.has(t.item_key))

    if (duplicateTemplates.length > 0) {
      const duplicateLabels = duplicateTemplates.map(t => t.item_label).join(', ')
      alert(`ไม่สามารถสร้างเอกสารได้เนื่องจากรายการต่อไปนี้ถูกสร้างการตรวจสอบไปแล้วในรอบนี้: ${duplicateLabels}`)
      setCreating(false)
      return
    }

    const noRes = await getNextNo('CHK', date)
    const docNo = noRes ? noRes.nextNo : `CHK-${Date.now()}`

    const { data: newDoc, error } = await supabase
      .from('checklist_docs')
      .insert([{
        doc_no: docNo,
        freq_type: freq,
        period_date: date,
        status: 'Open',
        created_by: userEmail,
        created_by_id: userId
      }])
      .select().single()

    if (error) { alert(error.message); setCreating(false); return }
    if (noRes) { const { updateLastNo } = await import('@/lib/noSeries'); await updateLastNo('CHK', docNo, date) }

    // Reuse selectedTemplates declared on line 718
    const inserts = selectedTemplates.map(t => {
      const config = { ...(t.template_config || {}) }
      
      // Normalize photo_points for T1 (Photo Evidence)
      if (t.ui_template_type === 1 && config.photo_points) {
        config.photo_points = config.photo_points.map((p, idx) => {
          if (typeof p === 'string') return { label: p, point_code: `P${(idx + 1).toString().padStart(2, '0')}` }
          return p
        })
      }

      return {
        doc_id: newDoc.id,
        item_key: t.item_key,
        item_label: t.item_label,
        status: null,
        template_data: {
          _snapshot: {
            ui_template_type: t.ui_template_type || 0,
            config: config,
            instruction: t.instruction || '',
            category: t.category || 'General'
          }
        }
      }
    })

    await supabase.from('checklist_items').insert(inserts)
    await recordLog(newDoc.id, 'checklist', `สร้างเอกสาร (${freq})`, `เลือก ${selectedTemplateIds.length} รายการ`, userEmail)
    
    onCreated(newDoc.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: step === 1 ? 450 : 800, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{step === 1 ? 'สร้างเอกสารใหม่' : 'เลือกรายการตรวจสอบ'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>ความถี่ในการตรวจสอบ</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Array.from(new Set((templates||[]).map(t=>t.freq_type))).sort().map(f => (
                    <button key={f} onClick={() => setFreq(f)} style={{ padding: '12px', borderRadius: 12, border: freq === f ? '2px solid #2563eb' : '1px solid #e2e8f0', background: freq === f ? '#eff6ff' : '#fff', color: freq === f ? '#2563eb' : '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>ประจำวันที่ (Period Date)</label>
                <div style={{ position: 'relative' }}>
                  {/* Styled Display Box */}
                  <div style={{ width: '100%', padding: '12px', paddingRight: 80, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{formatDate(date)}</span>
                    <span style={{ fontSize: 16 }}>📅</span>
                  </div>
                  
                  {/* Invisible Native Input */}
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    onClick={(e) => { try { e.target.showPicker() } catch(err) {} }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', color: 'transparent', background: 'transparent' }} 
                  />

                  <button 
                    onClick={() => {
                      const d = new Date()
                      const y = d.getFullYear()
                      const m = String(d.getMonth() + 1).padStart(2, '0')
                      const day = String(d.getDate()).padStart(2, '0')
                      setDate(`${y}-${m}-${day}`)
                    }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#1e40af', zIndex: 10 }}
                  >
                    TODAY
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>* ระบบจะนำวันที่นี้ไปหาช่วงเวลา (สัปดาห์/เดือน/ปี) ที่เกี่ยวข้องอัตโนมัติ</div>
              </div>

              <button onClick={fetchAvailableItems} disabled={loading} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{loading ? 'กำลังตรวจสอบข้อมูล...' : 'ถัดไป: เลือกรายการตรวจสอบ'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, color: '#475569' }}>พบรายการทั้งหมด <strong>{items.length}</strong> รายการสำหรับ {freq}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setSelectedTemplateIds(items.filter(i => !i.isUsed).map(i => i.selection_key))} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>เลือกทั้งหมด</button>
                  <button onClick={() => setSelectedTemplateIds([])} style={{ border: 'none', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ล้างการเลือก</button>
                </div>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: 40, padding: 12 }}></th>
                      <th style={{ padding: 12, textAlign: 'left' }}>หมวดหมู่</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>รายการ</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>สถานะในรอบนี้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.selection_key} style={{ borderBottom: '1px solid #f1f5f9', opacity: item.isUsed ? 0.6 : 1, background: item.isUsed ? '#f8fafc' : '#fff' }}>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            disabled={item.isUsed}
                            checked={selectedTemplateIds.includes(item.selection_key)} 
                            onChange={e => {
                              if (e.target.checked) setSelectedTemplateIds([...selectedTemplateIds, item.selection_key])
                              else setSelectedTemplateIds(selectedTemplateIds.filter(k => k !== item.selection_key))
                            }}
                            style={{ width: 18, height: 18, cursor: item.isUsed ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: 12, color: '#64748b', fontSize: 11, fontWeight: 700 }}>{item.category}</td>
                        <td style={{ padding: 12, fontWeight: 600, color: '#1e293b' }}>{item.item_label}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {item.isUsed ? (
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>ตรวจไปแล้ว</span>
                          ) : (
                            <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>ว่าง</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>ย้อนกลับ</button>
                <button onClick={handleFinalCreate} disabled={creating || selectedTemplateIds.length === 0} style={{ flex: 2, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, opacity: selectedTemplateIds.length === 0 ? 0.5 : 1 }}>{creating ? 'กำลังสร้างเอกสาร...' : `สร้างเอกสาร (${selectedTemplateIds.length} รายการ)`}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



export default function ChecklistListPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดหน้า Checklist...</div>}>
      <ChecklistListForm />
    </Suspense>
  )
}
