'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function ApproveContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tokenData, setTokenData] = useState(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!token) {
      setError('ไม่พบ token สำหรับการอนุมัติ')
      setStatus('invalid')
      setLoading(false)
      return
    }

    const fetchTokenInfo = async () => {
      try {
        const res = await fetch(`/api/approval/verify?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'ไม่สามารถดึงข้อมูลลิงก์อนุมัติได้')
          if (data.action) setStatus('used')
          else if (data.isExpired) setStatus('expired')
          else if (data.consumed) setStatus('consumed')
          else if (data.revoked) setStatus('revoked')
          else setStatus('invalid')
          return
        }

        setTokenData(data)
        setStatus('pending')
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
        setStatus('invalid')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
  }, [token])

  const handleAction = async (action) => {
    if (!confirm(`ยืนยันการ${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการนี้ใช่หรือไม่`)) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/approval/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถดำเนินการได้')
        return
      }
      setTokenData((prev) => ({ ...(prev || {}), action }))
      setStatus('success')
    } catch (err) {
      setError('ไม่สามารถดำเนินการได้ในขณะนี้')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>กำลังเตรียมลิงก์อนุมัติ...</div>
      </div>
    )
  }

  const cardStyle = {
    width: '100%',
    maxWidth: '1120px',
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid #e2e8f0',
    borderRadius: '28px',
    boxShadow: '0 25px 60px -30px rgba(15,23,42,0.35)',
    padding: '32px',
  }

  const resolutionFieldStyle = {
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    borderRadius: 14,
    padding: '14px 16px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      display: 'grid',
      placeItems: 'center',
      background: 'radial-gradient(circle at top left, #dbeafe 0%, transparent 35%), radial-gradient(circle at bottom right, rgba(125,211,252,0.35) 0%, transparent 28%), linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
    }}>
      <div style={cardStyle}>
        {status === 'pending' && tokenData && (
          <>
            <div className="approve-shell">
              <section className="approve-hero">
                <div style={{ display: 'inline-flex', padding: '7px 14px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 800, marginBottom: 18 }}>
                  Public Approval Link
                </div>
                <h1 style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.08 }}>อนุมัติเอกสาร</h1>
                <p style={{ margin: '12px 0 28px 0', color: '#475569', lineHeight: 1.7, fontSize: 18, maxWidth: 560 }}>
                  คุณกำลังใช้งานลิงก์อนุมัติแบบ one-time session สำหรับ <strong>{tokenData.approver_name}</strong>
                </p>

                <div style={{ border: '1px solid #dbe7f5', background: 'linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%)', borderRadius: 18, padding: 22, marginBottom: 24 }}>
                  <div className="approve-meta-grid">
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>เลขที่เอกสาร</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>{tokenData.document_no}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>สถานะลิงก์</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8', marginTop: 8 }}>
                        Step {tokenData.step_order || '-'} • หมดอายุ {new Date(tokenData.expires_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>หัวข้อ</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 6 }}>{tokenData.document_title}</div>
                  </div>
                </div>

                {tokenData.document_type === 'incident' && tokenData.document_context && (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>
                      รายละเอียดการแก้ไขปัญหา
                    </div>
                    <div className="approve-resolution-grid">
                      <div style={resolutionFieldStyle}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Root Cause Analysis</div>
                        <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                          {tokenData.document_context.root_cause || '— ไม่มีข้อมูล —'}
                        </div>
                      </div>
                      <div style={resolutionFieldStyle}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Resolution</div>
                        <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                          {tokenData.document_context.resolution || '— ไม่มีข้อมูล —'}
                        </div>
                      </div>
                      <div style={resolutionFieldStyle}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Corrective Action</div>
                        <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                          {tokenData.document_context.corrective_action || '— ไม่มีข้อมูล —'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <aside className="approve-sidebar">
                <div className="approve-sidebar-card">
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1e293b', marginBottom: 10 }}>
                    ความเห็นเพิ่มเติม
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 12 }}>
                    ระบุความเห็นประกอบการอนุมัติหรือการปฏิเสธได้ตามต้องการ
                  </div>
                  <textarea
                    rows={8}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="ระบุความเห็นประกอบการอนุมัติ"
                    style={{ width: '100%', borderRadius: 16, border: '1px solid #cbd5e1', padding: '16px 18px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 200 }}
                  />

                  {error && (
                    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: 13, fontWeight: 700 }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 18 }}>
                    <button
                      type="button"
                      onClick={() => handleAction('approved')}
                      disabled={submitting}
                      style={{ padding: '16px 18px', borderRadius: 16, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}
                    >
                      {submitting ? 'กำลังบันทึก...' : 'อนุมัติ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('rejected')}
                      disabled={submitting}
                      style={{ padding: '16px 18px', borderRadius: 16, border: '1px solid #fca5a5', background: '#fff1f2', color: '#be123c', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}
                    >
                      ปฏิเสธ
                    </button>
                  </div>

                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                    ลิงก์นี้จะใช้ได้กับ browser session นี้เท่านั้นหลังจากเปิดครั้งแรก หากปิด session หรือเปิดซ้ำจากที่อื่นต้องให้ผู้ส่งกด resend ใหม่
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#059669', margin: 0 }}>บันทึกสำเร็จ</h1>
            <p style={{ margin: '12px 0 0 0', color: '#475569', lineHeight: 1.7 }}>
              ระบบบันทึกการ{tokenData?.action === 'rejected' ? 'ปฏิเสธ' : 'อนุมัติ'}เอกสารเรียบร้อยแล้ว
            </p>
          </>
        )}

        {status !== 'pending' && status !== 'success' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#b91c1c', margin: 0 }}>ไม่สามารถใช้งานลิงก์นี้ได้</h1>
            <p style={{ margin: '12px 0 0 0', color: '#475569', lineHeight: 1.7 }}>
              {error || 'กรุณาขอให้ผู้ส่งเอกสารส่งลิงก์อนุมัติใหม่อีกครั้ง'}
            </p>
          </>
        )}
      </div>
      <style jsx>{`
        .approve-shell {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.9fr);
          gap: 28px;
          align-items: start;
        }

        .approve-hero {
          min-width: 0;
        }

        .approve-sidebar {
          min-width: 0;
          position: sticky;
          top: 24px;
        }

        .approve-sidebar-card {
          border: 1px solid #dbe7f5;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 18px 40px -28px rgba(15, 23, 42, 0.28);
        }

        .approve-meta-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .approve-resolution-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 1024px) {
          .approve-shell {
            grid-template-columns: 1fr;
          }

          .approve-sidebar {
            position: static;
          }

          .approve-resolution-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .approve-meta-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .approve-shell {
            gap: 18px;
          }
        }
      `}</style>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading...</div>}>
      <ApproveContent />
    </Suspense>
  )
}
