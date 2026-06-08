'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'
import { getSystemLogs, adminResetWorkflow } from '@/app/actions/workflow'

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('audit')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const isReadOnlyAuditor = currentUser?.role === 'auditor'

  const loadLogs = async (type, pageToLoad = 0, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)
    
    setError(null)
    try {
      const res = await getSystemLogs(type, { page: pageToLoad, limit: 20 })
      if (res.error) throw new Error(res.error)
      
      const newLogs = res.data || []
      if (isLoadMore) {
        setLogs(prev => [...prev, ...newLogs])
      } else {
        setLogs(newLogs)
      }
      
      // Determine if there's more to load
      // For combined logs, we check if we got a full batch of 20
      setHasMore(newLogs.length === 20)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setCurrentUser(profile)
      }
    }
    fetchUser()
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadLogs(activeTab, nextPage, true)
  }

  const renderFieldChanges = (changes = []) => {
    if (!Array.isArray(changes) || changes.length === 0) {
      return <div style={{ fontSize: 13, color: '#64748b' }}>ไม่พบ field changes</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {changes.map((change, index) => (
          <div key={`${change.field}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{change.field}</div>
            {'summary' in change ? (
              <div style={{ fontSize: 13, color: '#475569' }}>{change.summary}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Old</div>
                  <div style={{ fontSize: 13, color: '#334155', wordBreak: 'break-word' }}>{String(change.old_value ?? '—')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>New</div>
                  <div style={{ fontSize: 13, color: '#334155', wordBreak: 'break-word' }}>{String(change.new_value ?? '—')}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderTimestamp = (dateStr) => {
    const full = formatDateTime(dateStr)
    if (full === '—') return '—'
    const parts = full.split(' ')
    const time = parts.pop()
    const date = parts.join(' ')
    return (
      <div style={{ lineHeight: 1.4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{date}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{time}</div>
      </div>
    )
  }

  const renderLogDetailsText = (log) => {
    if (!log) return '—'

    if (typeof log.details_text === 'string' && log.details_text.trim()) {
      return log.details_text
    }

    if (typeof log.details === 'string' && log.details.trim()) {
      return log.details
    }

    if (log.details && typeof log.details === 'object') {
      try {
        return JSON.stringify(log.details, null, 2)
      } catch {
        return '[details object]'
      }
    }

    return '—'
  }

  const handleOpenReset = (log) => {
    setSelectedLog(log)
    setShowResetModal(true)
    setAdminPassword('')
    setResetError(null)
  }

  const handleResetWorkflow = async () => {
    if (!adminPassword) {
      setResetError('กรุณากรอกรหัสผ่านเพื่อยืนยัน')
      return
    }
    
    setResetLoading(true)
    setResetError(null)
    try {
      // Find the actual doc UUID if available, or use the one from log
      // In getSystemLogs, we should ensure we have the doc ID. 
      // Looking at getSystemLogs, the 'approval' type returns log.id but not doc_id directly in the mapped object?
      // Wait, let's check getSystemLogs mapping again.
      
      const res = await adminResetWorkflow(selectedLog.doc_id || selectedLog.id, selectedLog.category, adminPassword)
      if (res.error) throw new Error(res.error)
      
      alert('Reset Workflow สำเร็จ! สถานะเอกสารกลับเป็น Open เรียบร้อย')
      setShowResetModal(false)
      loadLogs(activeTab)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  // Group logs to find latest for each doc
  const latestDocLogIds = new Set();
  const seenDocs = new Set();
  if (Array.isArray(logs)) {
    logs.forEach(log => {
      if (log.doc_id && !seenDocs.has(log.doc_id)) {
        latestDocLogIds.add(log.id);
        seenDocs.add(log.doc_id);
      }
    });
  }

  const fetchGuide = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'logs_guide_content')
      .maybeSingle()

    if (!error && data?.value) {
      setGuideContent(data.value)
    } else {
      setGuideContent(`### 🔍 คู่มือระบบตรวจสอบบันทึก (System Logs & Audit Trails)
ระบบรวบรวมบันทึกเหตุการณ์สำคัญทั้งหมดที่เกิดขึ้นในระบบ เพื่อความโปร่งใสและการตรวจสอบย้อนหลัง (Traceability)

---
#### **1. ประเภทของบันทึก (Log Categories)**

#### **Audit Logs (🔍)**
- บันทึกการแก้ไขข้อมูล Master Data และการเปลี่ยนแปลงการตั้งค่าระบบ
- ระบุชัดเจนว่า "ใคร", "ทำอะไร", "เมื่อไหร่"

#### **Approval Logs (✅)**
- บันทึกประวัติการอนุมัติเอกสาร Checklist และ Incident ทุกขั้นตอน
- **Admin Feature:** หากพบข้อผิดพลาดในขั้นตอนการอนุมัติ Admin สามารถใช้ปุ่ม **[Reset]** เพื่อดีดเอกสารกลับไปเป็นสถานะ Open ได้ (ต้องยืนยันรหัสผ่าน Admin)

#### **Login History (🔑)**
- ตรวจสอบประวัติการเข้าสู่ระบบ
- แสดงข้อมูลอุปกรณ์ (User Agent) เพื่อเฝ้าระวังการเข้าถึงที่ผิดปกติ

#### **System Errors (⚙️)**
- บันทึกข้อผิดพลาดทางเทคนิคที่เกิดขึ้นในระบบ (Runtime Errors)
- ใช้สำหรับทีม Support ในการวิเคราะห์และแก้ไข Bug

---
#### **2. การจัดการข้อมูล**
- **Print Report:** พิมพ์หน้านี้เป็นเอกสาร PDF เพื่อใช้ในการประชุมหรือเก็บเข้าแฟ้ม Audit
- **Export CSV:** นำข้อมูลออกไปวิเคราะห์ต่อใน Excel หรือระบบ BI ภายนอก`)
    }
  }

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    setSelectedLog(null)
    setLogs([])
    setError(null)
    setLoading(true)
    loadLogs(activeTab, 0, false)
    fetchGuide()
  }, [activeTab])

  const handleSaveGuide = async () => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'logs_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) alert(error.message)
    else { setEditingGuide(false); alert('บันทึกคู่มือสำเร็จ') }
  }

  return (
    <div className="logs-page-container" style={{ 
      padding: 'var(--page-padding, 24px)', maxWidth: 1200, margin: '0 auto', 
      background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .header-actions { width: 100% !important; }
          .header-actions button { flex: 1 !important; }
          .tabs-scrollable { 
            width: 100% !important; 
            overflow-x: auto !important; 
            padding: 4px !important;
            margin-bottom: 16px !important;
            scrollbar-width: none;
          }
          .tabs-scrollable::-webkit-scrollbar { display: none; }
          .tabs-scrollable button { white-space: nowrap !important; }
          .table-wrapper { overflow-x: auto !important; margin: 0 -12px !important; }
          .logs-table { min-width: 800px !important; }
        }
        @media print {
          .no-print { display: none !important; }
          .logs-page-container { padding: 0 !important; background: #fff !important; }
        }
        * { box-sizing: border-box; }
        .table-row-hover:hover { background-color: #f8fafc !important; }
        .logs-table th { position: sticky; top: 0; z-index: 10; background: #f9fafb; box-shadow: inset 0 -1px 0 #e5e7eb; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #4f46e5, #818cf8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>📖</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>System Logs Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการตรวจสอบประวัติระบบ</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && (
                  <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    {editingGuide ? '👁 View' : '✏️ Edit'}
                  </button>
                )}
              <button data-readonly-allowed="true" onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #4f46e5` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.trim().split('\n').map((line, lIdx) => {
                          if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                          if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                          return <p key={lIdx} style={{ margin: '0 0 10px 0' }}>{line.includes('**') ? line.split('**').map((p,i)=>i%2===1?<strong key={i} style={{color:'#1e3a8a'}}>{p}</strong>:p) : line}</p>
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
              🔍
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              System Logs & Audit
              <button data-readonly-allowed="true" className="no-print" onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eef2ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>ตรวจสอบบันทึกการใช้งานระบบและการเปลี่ยนแปลงข้อมูล (Audit Trails)</p>
        </div>
        <div className="action-dock no-print" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button data-readonly-allowed="true" onClick={() => window.print()} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            🖨️ Print Report
          </button>
          <button data-readonly-allowed="true" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-scrollable no-print" style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px)', padding: 4, borderRadius: 18, border: '1px solid rgba(226, 232, 240, 0.8)', width: 'fit-content' }}>
        {[
          { id: 'audit', label: 'Audit Logs', icon: '🔍' },
          { id: 'approval', label: 'Approval Logs', icon: '✅' },
          { id: 'admin', label: 'Admin Actions', icon: '🛡️' },
          { id: 'backup', label: 'Backup Logs', icon: '🗄️' },
          { id: 'login', label: 'Login History', icon: '🔑' },
          { id: 'system', label: 'System Errors', icon: '⚙️' }
        ].map(tab => (
          <button
            data-readonly-allowed="true"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab.id ? '#4f46e5' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Table */}
      <div className="table-wrapper custom-scrollbar" style={{ 
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', 
        overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'
      }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ color: '#64748b', fontWeight: 500 }}>กำลังโหลดประวัติระบบ...</div>
          </div>
        ) : error ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ color: '#dc2626', fontWeight: 600 }}>เกิดข้อผิดพลาด: {error}</div>
            <button data-readonly-allowed="true" onClick={() => loadLogs(activeTab, 0, false)} style={{ marginTop: 16, padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>ลองใหม่</button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
            <div style={{ color: '#64748b', fontWeight: 500 }}>ไม่พบข้อมูลในหมวดหมู่นี้</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <table className="logs-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Timestamp</th>
                  {activeTab === 'approval' ? (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Doc No.</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>User</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', textAlign: 'center' }}>Manage</th>
                    </>
                  ) : activeTab === 'login' ? (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Device/Agent</th>
                    </>
                  ) : activeTab === 'system' ? (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Error Message</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Context (Source/Action)</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Metadata</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', minWidth: 160 }}>
                        {activeTab === 'admin' ? 'Target User' : 'Doc No.'}
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Details</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>User</th>
                      <th style={{ padding: '16px 12px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', width: 80, textAlign: 'center' }}>Review</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 20px', width: 120 }}>
                      {renderTimestamp(log.created_at || log.timestamp)}
                    </td>
                    
                    {activeTab === 'approval' ? (
                      <>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: log.category === 'Checklist' ? '#e0e7ff' : '#fef3c7', color: log.category === 'Checklist' ? '#4338ca' : '#92400e' }}>
                            {log.category}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.docNo}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: (log.action === 'Approved' || log.action.startsWith('Approved:') || log.action.includes('ปิดเคส') || log.action === 'Auto-Closed') ? '#d1fae5' : (log.action === 'Rejected' || log.action.startsWith('Rejected:') || log.action.includes('ตีกลับ')) ? '#fee2e2' : log.action.includes('Submit') ? '#eff6ff' : '#f3f4f6',
                            color: (log.action === 'Approved' || log.action.startsWith('Approved:') || log.action.includes('ปิดเคส') || log.action === 'Auto-Closed') ? '#065f46' : (log.action === 'Rejected' || log.action.startsWith('Rejected:') || log.action.includes('ตีกลับ')) ? '#991b1b' : log.action.includes('Submit') ? '#1e40af' : '#374151'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>{log.user}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {latestDocLogIds.has(log.id) && 
                           log.current_workflow_status === 'pending' && 
                           log.current_status !== 'ปิดเอกสาร (Closed)' && 
                           log.current_status !== 'Closed' && (
                            <button 
                              onClick={() => handleOpenReset(log)}
                              disabled={isReadOnlyAuditor}
                              style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reset
                            </button>
                          )}
                        </td>
                      </>
                    ) : activeTab === 'login' ? (
                      <>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#111827' }}>{log.user_email || '—'}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{log.full_name && log.full_name !== log.user_email ? log.full_name : '—'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: log.action === 'login' ? '#dcfce7' : '#f1f5f9', color: log.action === 'login' ? '#166534' : '#475569' }}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 12, color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.user_agent}
                        </td>
                      </>
                    ) : activeTab === 'system' ? (
                      <>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{log.message}</td>
                        <td style={{ padding: '16px 20px', fontSize: 12, color: '#64748b' }}>
                          <div><strong>Source:</strong> {log.metadata?.source || '—'}</div>
                          <div><strong>Action:</strong> {log.metadata?.action || '—'}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <button 
                            data-readonly-allowed="true"
                            onClick={() => setSelectedLog(log)}
                            style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            View Metadata
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, 
                            background: log.category === 'Checklist' ? '#e0e7ff' : log.category === 'Incident' ? '#fef3c7' : '#f3f4f6', 
                            color: log.category === 'Checklist' ? '#4338ca' : log.category === 'Incident' ? '#92400e' : '#4b5563' 
                          }}>
                            {log.category || 'System'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.docNo || '—'}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.action}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderLogDetailsText(log)}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#6b7280' }}>{log.full_name || log.user || log.user_email || 'System'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            data-readonly-allowed="true"
                            onClick={() => setSelectedLog(log)}
                            style={{ padding: '5px 10px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hasMore && (
              <div style={{ padding: '24px', textAlign: 'center', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                <button 
                  data-readonly-allowed="true"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{ 
                    padding: '12px 40px', background: '#fff', border: '1px solid #e2e8f0', 
                    borderRadius: 14, fontSize: 14, fontWeight: 700, color: '#1e293b',
                    cursor: loadingMore ? 'default' : 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    display: 'inline-flex', alignItems: 'center', gap: 10
                  }}
                  onMouseEnter={e => !loadingMore && (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => !loadingMore && (e.currentTarget.style.background = '#fff')}
                >
                  {loadingMore ? (
                    <>⏳ กำลังโหลด...</>
                  ) : (
                    <>➕ แสดงข้อมูลเพิ่มเติม</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🛡️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Reset Workflow?</h2>
              <p style={{ fontSize: 14, color: '#6b7280' }}>การดำเนินการนี้จะดีดเอกสาร <strong>{selectedLog?.docNo}</strong> กลับไปเป็นสถานะ Open เพื่อให้แก้ไขได้ใหม่</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Confirm Admin Password</label>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านของคุณ"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
              {resetError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{resetError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowResetModal(false)}
                style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResetWorkflow}
                disabled={resetLoading}
                style={{ flex: 1, padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.7 : 1 }}
              >
                {resetLoading ? 'Processing...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLog && !showResetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 20px 40px rgba(15,23,42,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 }}>{selectedLog.category || 'Audit Detail'}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{selectedLog.action || 'Log Detail'}</div>
              </div>
              <button data-readonly-allowed="true" onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: 30, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Doc / Entity</div>
                  <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{selectedLog.docNo || selectedLog.entity_label || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>User</div>
                  <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{selectedLog.full_name || selectedLog.user || selectedLog.user_email || 'System'}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Scope</div>
                  <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{selectedLog.scope || selectedLog.metadata?.scope || '—'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Details</div>
                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderLogDetailsText(selectedLog)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Field Changes</div>
                {renderFieldChanges(selectedLog.field_changes || selectedLog.metadata?.field_changes || [])}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Metadata</div>
                <pre style={{ margin: 0, padding: 16, borderRadius: 14, background: '#0f172a', color: '#e2e8f0', fontSize: 12, overflowX: 'auto' }}>
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
