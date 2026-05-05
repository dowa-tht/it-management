'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateNumeric } from '@/lib/dateFormat'
import { getUnifiedPendingApprovals } from '@/app/actions/workflow'

export default function ApprovalsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      const res = await getUnifiedPendingApprovals()
      if (res.error) throw new Error(res.error)
      setItems(res.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังตรวจสอบงานค้างของคุณ...</div>
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาด: {error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Waiting for Approval</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>รายการเอกสารและใบงานที่รอการตรวจสอบและอนุมัติจากคุณ</p>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
          พบทั้งหมด {items.length} รายการ
        </div>
      </div>

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
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Doc No.</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Subject</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Submit Date</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Requester</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f3f4f6', transition: 'background 0.2s' }} className="hover-row">
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 20, 
                        fontSize: 11, 
                        fontWeight: 600,
                        background: item.category === 'Checklist' ? '#e0e7ff' : '#fef3c7',
                        color: item.category === 'Checklist' ? '#4338ca' : '#92400e'
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>
                      {item.docNo}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.subject}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.type} Management</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>
                      {item.requestDate}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6b7280' }}>
                          {item.requester.charAt(0)}
                        </div>
                        {item.requester}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Link href={item.link} style={{ 
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#4f46e5',
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.2s'
                      }}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .hover-row:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  )
}
