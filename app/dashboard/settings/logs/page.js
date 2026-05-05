'use client'
import { useState } from 'react'

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('audit')

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>System Logs</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>ตรวจสอบบันทึกการใช้งานระบบและการเปลี่ยนแปลงข้อมูล (Audit Trails)</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
        {[
          { id: 'audit', label: 'Audit Logs', icon: '🔍' },
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

      {/* Placeholder Content */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>Log Management Under Development</h3>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto 24px' }}>
          หน้านี้กำลังอยู่ระหว่างการพัฒนาเพื่อเชื่อมต่อกับฐานข้อมูล Log และระบบ Export ข้อมูล (CSV/Excel)
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button disabled style={{ padding: '10px 20px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: 8, cursor: 'not-allowed', fontSize: 13, fontWeight: 600 }}>
            📥 Export CSV
          </button>
          <button disabled style={{ padding: '10px 20px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: 8, cursor: 'not-allowed', fontSize: 13, fontWeight: 600 }}>
            📄 Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
