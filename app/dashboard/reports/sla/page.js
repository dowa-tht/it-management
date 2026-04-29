'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSLAReportData, saveSLASettings } from '@/app/actions/reports'
import { formatDate } from '@/lib/dateFormat'

export default function SLAReportPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [editedSettings, setEditedSettings] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
    const getUser = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
          setCurrentUser(profile)
        }
      } catch (err) {
        console.error('User fetch error:', err)
      }
    }
    getUser()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getSLAReportData(dateRange.start, dateRange.end)
      if (res.success) {
        setData(res)
      } else {
        setData({ data: [], summary: { total: 0, resolved: 0, passed: 0, failed: 0, complianceRate: 0 } })
      }
    } catch (err) {
      setData({ data: [], summary: { total: 0, resolved: 0, passed: 0, failed: 0, complianceRate: 0 } })
    }
    setLoading(false)
  }

  const calculateDiffMinutes = (start, end) => {
    try {
      const [h1, m1] = start.split(':').map(Number)
      const [h2, m2] = end.split(':').map(Number)
      return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1))
    } catch (e) { return 0 }
  }

  // Help Modal Component
  const SLAGuideModal = () => {
    const settings = editedSettings || data?.settings || {
      working_hours: { start: '08:30', end: '17:30' },
      sla_limits: { High: 240, Medium: 480, Low: 4320, Response: { High: 15, Medium: 60, Low: 240 } }
    }
    
    // Ensure Response settings exist in fallbacks
    if (!settings.sla_limits.Response) {
      settings.sla_limits.Response = { High: 15, Medium: 60, Low: 240 }
    }

    const handleSave = async () => {
      setLoading(true)
      const res = await saveSLASettings(settings.working_hours, settings.sla_limits)
      if (res.success) {
        await fetchData()
        setIsEditing(false)
        setEditedSettings(null)
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + res.error)
      }
      setLoading(false)
    }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px 30px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>📊 เกณฑ์การคำนวณ SLA Compliance</h2>
              {(currentUser?.role?.toLowerCase() === 'superuser' || currentUser?.role?.toLowerCase() === 'administrator') && !isEditing && (
                <button 
                  onClick={() => {
                    setEditedSettings(JSON.parse(JSON.stringify(settings)))
                    setIsEditing(true)
                  }}
                  style={{ padding: '4px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#374151', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  ⚙️ แก้ไขเกณฑ์
                </button>
              )}
            </div>
            <button onClick={() => { setShowHelp(false); setIsEditing(false); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
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
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <input type="text" value={settings.working_hours.start} 
                        onChange={e => setEditedSettings({...settings, working_hours: {...settings.working_hours, start: e.target.value}})}
                        style={{ width: 60, padding: 4, border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center' }} />
                      <span>-</span>
                      <input type="text" value={settings.working_hours.end} 
                        onChange={e => setEditedSettings({...settings, working_hours: {...settings.working_hours, end: e.target.value}})}
                        style={{ width: 60, padding: 4, border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center' }} />
                    </div>
                  ) : (
                    `${settings.working_hours.start} - ${settings.working_hours.end} น. (จันทร์ - ศุกร์)`
                  )}
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
                    <th style={{ padding: '8px 0' }}>Response (นาที)</th>
                    <th style={{ padding: '8px 0' }}>Resolution (นาที)</th>
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
                      <td style={{ padding: '10px 0' }}>
                        {isEditing ? (
                          <input type="number" value={settings.sla_limits.Response?.[item.key] || 0} 
                            onChange={e => {
                              const newResp = { ...(settings.sla_limits.Response || {}), [item.key]: parseInt(e.target.value) }
                              setEditedSettings({...settings, sla_limits: {...settings.sla_limits, Response: newResp}})
                            }}
                            style={{ width: 60, padding: '4px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        ) : (
                          `${settings.sla_limits.Response?.[item.key] || 0}m`
                        )}
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {isEditing ? (
                          <input type="number" value={settings.sla_limits[item.key]} 
                            onChange={e => setEditedSettings({...settings, sla_limits: {...settings.sla_limits, [item.key]: parseInt(e.target.value)}})}
                            style={{ width: 60, padding: '4px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        ) : (
                          `${settings.sla_limits[item.key]?.toLocaleString()}m`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {!isEditing && (
              <section style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>💡 ตัวอย่างการคำนวณแบบแยกดัชนี</h3>
                <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.6 }}>
                  <div>• <strong>Response:</strong> นับจากเวลาเปิดเคส จนถึงเวลาที่ IT กด "รับเรื่อง"</div>
                  <div>• <strong>Resolution:</strong> นับจากเวลาเปิดเคส จนถึงเวลาที่แก้ไขเสร็จ (หักช่วงเวลา Exclusion)</div>
                  <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, fontSize: 11 }}>
                    <strong>Dashboard Score:</strong> (Response % + Resolution %) / 2
                  </div>
                </div>
              </section>
            )}
            
            <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 12 }}>
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={loading} style={{ padding: '10px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {loading ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditedSettings(null); }} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                </>
              ) : (
                <button onClick={() => setShowHelp(false)} style={{ padding: '10px 30px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>เข้าใจแล้ว</button>
              )}
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
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {showHelp && <SLAGuideModal />}
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0' }}>SLA Compliance Dashboard</h1>
            <button 
              onClick={() => setShowHelp(true)}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '50%', width: 20, height: 20, fontSize: 12, color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginTop: 4 }}
              title="ดูเกณฑ์การคำนวณ SLA"
            >
              ?
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>วิเคราะห์ประสิทธิภาพการตอบสนองและการแก้ไขปัญหา</div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ padding: '7px 16px', background: loading ? '#93c5fd' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {loading ? 'กำลังโหลด...' : 'กรองข้อมูล'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
          borderRadius: 12, padding: 20, color: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' 
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 60, opacity: 0.15 }}>📊</div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>Overall Compliance (AVG)</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{summary.complianceRate === null ? 'N/A' : `${summary.complianceRate}%`}</div>
          <div style={{ fontSize: 10, marginTop: 8, opacity: 0.8 }}>ค่าเฉลี่ยของ Response และ Resolution</div>
        </div>
        
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>RESPONSE SLA</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: (summary.responseRate >= 95 ? '#059669' : '#dc2626') }}>
            {summary.responseRate === null ? 'N/A' : `${summary.responseRate}%`}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>เป้าหมายการรับงาน</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>RESOLUTION SLA</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: (summary.resolutionRate >= 95 ? '#059669' : '#dc2626') }}>
            {summary.resolutionRate === null ? 'N/A' : `${summary.resolutionRate}%`}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>เป้าหมายการแก้ปัญหา</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>TOTAL INCIDENTS</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>{summary.total}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>รายการที่เกิดขึ้นในช่วงนี้</div>
        </div>
      </div>

      {!loading && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            Incident List & Performance Details
          </div>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Case ID', 'Title', 'Date', 'Response SLA', 'Resolution SLA', ''].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 11, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล Incident ในช่วงเวลาที่เลือก</td></tr>
                ) : incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: 11 }}>{inc.case_number}</div>
                      <div style={{ fontSize: 10, color: inc.severity === 'High' ? '#dc2626' : '#6b7280', fontWeight: 600 }}>{inc.severity}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{inc.title}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {formatDate(inc.created_at).replaceAll('-', '/')}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {inc.responseMin !== null ? (
                        <div>
                          <span style={{ 
                            ...getStatusColor(inc.isResponseOK), 
                            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 
                          }}>
                            {inc.responseMin}m {inc.isResponseOK ? '✅' : '❌'}
                          </span>
                          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Target: {inc.responseLimit}m</div>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ยังไม่รับเรื่อง</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {inc.resolveMin !== null ? (
                        <div>
                          <span style={{ 
                            ...getStatusColor(inc.isResolveOK), 
                            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 
                          }}>
                            {inc.resolveMin}m {inc.isResolveOK ? '✅' : '❌'}
                          </span>
                          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Target: {inc.resolveLimit}m</div>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ยังไม่ปิดงาน</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Link href={`/dashboard/incidents/${inc.id}`} style={{ 
                        padding: '6px 12px', background: '#fff', color: '#1d4ed8', textDecoration: 'none', 
                        borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #d1d5db' 
                      }}>
                        เปิดดู
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
