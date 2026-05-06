'use client'
import { useState } from 'react'
import { runWorkflowMigration } from '@/app/actions/workflow'

export default function MigratePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleMigrate = async () => {
    if (!confirm('ยืนยันการย้ายข้อมูลประวัติการอนุมัติเข้าสู่ระบบ Workflow ใหม่?')) return
    setLoading(true)
    const res = await runWorkflowMigration()
    setResult(res)
    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Workflow Migration Tool</h1>
      <p style={{ color: '#64748b', marginBottom: 30 }}>
        เครื่องมือนี้จะทำการย้ายข้อมูลลายเซ็นและประวัติการอนุมัติเดิมจากตาราง Checklist และ Incident 
        เข้าสู่ตาราง <code>document_approvals</code> เพื่อให้ระบบใหม่แสดงผลประวัติเดิมได้
      </p>

      {!result ? (
        <button 
          onClick={handleMigrate}
          disabled={loading}
          style={{
            background: '#2563eb', color: '#fff', padding: '12px 24px',
            borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600
          }}>
          {loading ? 'กำลังย้ายข้อมูล... กรุณารอสักครู่' : '🚀 เริ่มต้นการ Migration'}
        </button>
      ) : (
        <div style={{ padding: 20, borderRadius: 8, background: result.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}` }}>
          <h2 style={{ color: result.success ? '#16a34a' : '#dc2626', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            {result.success ? 'Migration สำเร็จ!' : 'เกิดข้อผิดพลาด'}
          </h2>
          <pre style={{ fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre>
          <button onClick={() => window.location.href = '/dashboard'} style={{ marginTop: 20, padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>กลับไปหน้า Dashboard</button>
        </div>
      )}
    </div>
  )
}
