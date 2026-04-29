'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ApproveContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tokenData, setTokenData] = useState(null)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('pending') // pending, success, expired, used

  useEffect(() => {
    if (token) fetchTokenInfo()
    else {
      setError('ไม่พบรหัส Token สำหรับการอนุมัติ')
      setLoading(false)
    }
  }, [token])

  const fetchTokenInfo = async () => {
    try {
      const res = await fetch(`/api/approval/verify?token=${token}`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถดึงข้อมูลการอนุมัติได้')
        if (data.action) setStatus('used')
        else if (data.isExpired) setStatus('expired')
      } else {
        setTokenData(data)
        if (data.used_at) setStatus('used')
        else if (data.isExpired) setStatus('expired')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action) => {
    if (!confirm(`ยืนยันการ ${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} ใช่ไหม?`)) return
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/approval/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, comment })
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setTokenData(prev => ({ ...prev, action }))
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      alert('ไม่สามารถดำเนินการได้ในขณะนี้')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>กำลังดึงข้อมูลเอกสาร...</p>
        </div>
        <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px', 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '40px',
        textAlign: 'center'
      }}>
        
        {/* Status Icons */}
        <div style={{ marginBottom: '24px' }}>
          {status === 'pending' && <div style={{ fontSize: '64px' }}>📄</div>}
          {status === 'success' && <div style={{ fontSize: '64px' }}>✅</div>}
          {status === 'used' && <div style={{ fontSize: '64px' }}>⏳</div>}
          {(status === 'expired' || error) && <div style={{ fontSize: '64px' }}>⚠️</div>}
        </div>

        {status === 'pending' && tokenData && (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937', marginBottom: '8px' }}>
              พิจารณาการอนุมัติ
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>
              เรียน คุณ{tokenData.approver_name} กรุณาตรวจสอบข้อมูลด้านล่าง
            </p>

            <div style={{ 
              background: '#f9fafb', 
              borderRadius: '16px', 
              padding: '20px', 
              textAlign: 'left',
              marginBottom: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ประเภทเอกสาร</span>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>{tokenData.document_type}</div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ชื่อเอกสาร/รายการ</span>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>{tokenData.document_title}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>รหัสอ้างอิง</span>
                <div style={{ fontSize: '14px', color: '#1d4ed8', fontFamily: 'monospace' }}>#{tokenData.document_id}</div>
              </div>
            </div>

            <div style={{ marginBottom: '32px', textAlign: 'left' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
                ความเห็นเพิ่มเติม (ไม่บังคับ)
              </label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุเหตุผลในการอนุมัติหรือปฏิเสธ..."
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  minHeight: '100px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button 
                onClick={() => handleAction('rejected')}
                disabled={submitting}
                style={{ 
                  padding: '14px', 
                  borderRadius: '12px', 
                  border: '2px solid #ef4444',
                  background: 'transparent',
                  color: '#ef4444',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ปฏิเสธ
              </button>
              <button 
                onClick={() => handleAction('approved')}
                disabled={submitting}
                style={{ 
                  padding: '14px', 
                  borderRadius: '12px', 
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? 'กำลังบันทึก...' : 'อนุมัติรายการ'}
              </button>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginBottom: '16px' }}>
              ดำเนินการสำเร็จ
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
              ระบบได้บันทึกการ <b>{tokenData?.action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}</b> เอกสาร {tokenData?.document_title} เรียบร้อยแล้ว
            </p>
            <button 
              onClick={() => window.close()}
              style={{ padding: '12px 32px', background: '#374151', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              ปิดหน้านี้
            </button>
          </>
        )}

        {status === 'used' && (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937', marginBottom: '16px' }}>
              Token นี้ถูกใช้งานแล้ว
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
              รายการนี้ได้รับการดำเนินการไปแล้ว <br/>
              เมื่อวันที่ {new Date(tokenData?.used_at).toLocaleString('th-TH')}
            </p>
            <button 
              onClick={() => window.close()}
              style={{ padding: '12px 32px', background: '#374151', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              ปิดหน้านี้
            </button>
          </>
        )}

        {(status === 'expired' || error) && (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginBottom: '16px' }}>
              ไม่สามารถดำเนินการได้
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
              {error || 'ลิงก์การอนุมัตินี้หมดอายุหรือข้อมูลไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่ IT'}
            </p>
            <a href="mailto:it-support@dowa-it.com" style={{ color: '#1d4ed8', fontWeight: '600', textDecoration: 'none' }}>
              ติดต่อ IT Support
            </a>
          </>
        )}

      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApproveContent />
    </Suspense>
  )
}
