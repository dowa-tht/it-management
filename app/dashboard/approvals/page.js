'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUnifiedPendingApprovals, getApprovalAuditLog } from '@/app/actions/workflow'

const STATUS_CONFIG = {
  approved: { label: 'อนุมัติแล้ว', bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  pending:  { label: 'รออนุมัติ',   bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  waiting:  { label: 'รอลำดับก่อน', bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
}

const CATEGORY_CONFIG = {
  Incident: { bg: '#fef3c7', color: '#92400e' },
  Checklist: { bg: '#e0e7ff', color: '#4338ca' },
}

const SEVERITY_COLORS = {
  High: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Medium: { bg: '#ffedd5', color: '#9a3412', dot: '#f97316' },
  Low: { bg: '#f0fdf4', color: '#166534', dot: '#22c55e' }
}

function StatusBadge({ status, label }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {label || cfg.label}
    </span>
  )
}

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] || { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color
    }}>
      {category}
    </span>
  )
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────
// Tab 1: Pending Queue (เดิม)
// ─────────────────────────────────────────────
function PendingTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getUnifiedPendingApprovals().then(res => {
      if (res.error) setError(res.error)
      else setItems(res.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลด...</div>
  if (error)   return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาด: {error}</div>

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>ไม่มีงานค้างในขณะนี้</h3>
          <p style={{ fontSize: 14, color: '#6b7280' }}>เยี่ยมมาก! คุณดำเนินการอนุมัติงานทั้งหมดเสร็จสิ้นแล้ว</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['ประเภท', 'เลขที่เอกสาร', 'หัวข้อ', 'วันที่ส่ง', 'ผู้ขอ', 'Action'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '14px 20px' }}><CategoryBadge category={item.category} /></td>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>{item.docNo}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.subject}</div>
                      {item.severity && (
                        <span style={{ 
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, 
                          background: SEVERITY_COLORS[item.severity]?.bg || '#f3f4f6', 
                          color: SEVERITY_COLORS[item.severity]?.color || '#6b7280',
                          border: `1px solid ${SEVERITY_COLORS[item.severity]?.dot || '#e5e7eb'}`
                        }}>{item.severity}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.type}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }}>{item.requestDate}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#4b5563' }}>{item.requester}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <Link href={item.link} style={{ display: 'inline-block', padding: '7px 16px', background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 2: Approval Audit Log (ใหม่)
// ─────────────────────────────────────────────
function AuditLogTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getApprovalAuditLog({ limit: 300 }).then(res => {
      if (res.error) setError(res.error)
      else setRows(res.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลดประวัติ...</div>
  if (error)   return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาด: {error}</div>

  const filtered = rows.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
    if (search && !r.docNo?.toLowerCase().includes(search.toLowerCase()) && !r.subject?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const summaryCount = {
    approved: rows.filter(r => r.status === 'approved').length,
    pending: rows.filter(r => r.status === 'pending').length,
    waiting: rows.filter(r => r.status === 'waiting').length,
  }

  return (
    <div>
      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(summaryCount).map(([s, count]) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: filterStatus === s ? cfg.bg : '#f9fafb', border: `1px solid ${filterStatus === s ? cfg.dot : '#e5e7eb'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: filterStatus === s ? cfg.color : '#6b7280' }}>{cfg.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: filterStatus === s ? cfg.color : '#374151' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาเลขที่หรือหัวข้อ..."
          style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, flex: 1, minWidth: 180, outline: 'none' }}
        />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="all">ทุกประเภท</option>
          <option value="Incident">Incident</option>
          <option value="Checklist">Checklist</option>
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="all">ทุกความรุนแรง</option>
          <option value="High">🔴 High</option>
          <option value="Medium">🟠 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['ประเภท', 'เลขที่เอกสาร', 'หัวข้อ', 'ลำดับ', 'บทบาท', 'ผู้อนุมัติ', 'สถานะ', 'วันที่อนุมัติ', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', background: row.status === 'approved' ? '#fafffe' : row.status === 'pending' ? '#fffdf5' : '#fff' }}>
                    <td style={{ padding: '12px 16px' }}><CategoryBadge category={row.category} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.docNo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subject}</div>
                        {row.severity && (
                          <span style={{ 
                            fontSize: 9, fontWeight: 700, padding: '0px 4px', borderRadius: 3, 
                            background: SEVERITY_COLORS[row.severity]?.bg, 
                            color: SEVERITY_COLORS[row.severity]?.color 
                          }}>{row.severity}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>ผู้แจ้ง: {row.requester}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#f1f5f9', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                        {row.stepOrder}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{row.roleRequired || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                      {row.approverName !== '—' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                            {row.approverName.charAt(0)}
                          </div>
                          {row.approverName}
                        </div>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={row.status} label={row.statusLabel} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDateTime(row.actionAt)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link href={row.link} style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>ดู →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
          แสดง {filtered.length} จาก {rows.length} รายการ
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page with Tabs
// ─────────────────────────────────────────────
export default function ApprovalsPage() {
  const [tab, setTab] = useState('pending')

  const tabs = [
    { id: 'pending', label: '🔔 รออนุมัติ' },
    { id: 'log',     label: '📋 ประวัติการอนุมัติ' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Approval Center</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>จัดการและตรวจสอบประวัติการอนุมัติเอกสารทั้งหมดในระบบ</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? '#111827' : '#6b7280',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'pending' && <PendingTab />}
      {tab === 'log' && <AuditLogTab />}
    </div>
  )
}
