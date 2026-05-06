'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateNumeric } from '@/lib/dateFormat'
import { getUnifiedMyPendingItems } from '@/app/actions/workflow'

export default function MyPendingPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      const res = await getUnifiedMyPendingItems()
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังดึงข้อมูลงานที่คุณส่ง...</div>
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>เกิดข้อผิดพลาด: {error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>My Sent Pending Items</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>รายการเอกสารที่คุณส่งไปแล้วและยังอยู่ระหว่างรอการอนุมัติ</p>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
          พบทั้งหมด {items.length} รายการ
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>ไม่มีงานค้างติดตาม</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>เอกสารทั้งหมดที่คุณส่งไปได้รับการดำเนินการเรียบร้อยแล้ว</p>
            <Link href="/dashboard" style={{ marginTop: 20, display: 'inline-block', color: '#4f46e5', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              กลับไปที่ Dashboard
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Doc No.</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Subject</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Period/Date</th>
                  <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Workflow Status</th>
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
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.type} Tracking</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>
                      {item.requestDate}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></span>
                        <span style={{ fontSize: 13, color: '#b45309', fontWeight: 500 }}>{item.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Link href={item.link} style={{ 
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#f59e0b',
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                      }}>
                        View Card
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
          background-color: #fffbeb;
        }
      `}</style>
    </div>
  )
}
