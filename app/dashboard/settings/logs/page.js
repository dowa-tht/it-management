'use client'
import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/dateFormat'
import { getSystemLogs } from '@/app/actions/workflow'

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('audit')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadLogs = async (type) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getSystemLogs(type)
      if (res.error) throw new Error(res.error)
      setLogs(res.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(activeTab)
  }, [activeTab])

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>System Logs</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>ตรวจสอบบันทึกการใช้งานระบบและการเปลี่ยนแปลงข้อมูล (Audit Trails)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Print Report
          </button>
          <button style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'audit', label: 'Audit Logs', icon: '🔍' },
          { id: 'approval', label: 'Approval Logs', icon: '✅' },
          { id: 'login', label: 'Login History', icon: '🔑' },
          { id: 'system', label: 'System Errors', icon: '⚙️' }
        ].map(tab => (
          <button
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
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>กำลังโหลดข้อมูล Log...</div>
        ) : error ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาด: {error}</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>ไม่พบข้อมูลในหมวดหมู่นี้</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Timestamp</th>
                  {activeTab === 'approval' ? (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Doc No.</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>User</th>
                    </>
                  ) : activeTab === 'login' ? (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Device/Agent</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Details</th>
                      <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>User</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.created_at || log.timestamp)}
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
                            background: log.action === 'Approved' ? '#d1fae5' : log.action === 'Rejected' ? '#fee2e2' : '#f3f4f6',
                            color: log.action === 'Approved' ? '#065f46' : log.action === 'Rejected' ? '#991b1b' : '#374151'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>{log.user}</td>
                      </>
                    ) : activeTab === 'login' ? (
                      <>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.user_email}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: log.action === 'login' ? '#dcfce7' : '#f1f5f9', color: log.action === 'login' ? '#166534' : '#475569' }}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 12, color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.user_agent}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#f3f4f6', color: '#4b5563' }}>
                            {log.category || 'System'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.action}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>{log.details}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#6b7280' }}>{log.user_email}</td>
                      </>
                    )}
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
