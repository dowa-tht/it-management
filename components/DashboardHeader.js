'use client'
import Link from 'next/link'
import { formatDate } from '@/lib/dateFormat'

export default function DashboardHeader({ pendingApprovalsCount = 0, myPendingFollowupsCount = 0 }) {
  return (
    <div className="header-flex" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h1 className="dashboard-title" style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Dashboard</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          📅 {formatDate(new Date().toISOString())}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/dashboard/approvals" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: pendingApprovalsCount > 0 ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f3f4f6', 
            borderRadius: 10, padding: '8px 16px', color: pendingApprovalsCount > 0 ? '#fff' : '#9ca3af', 
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'transform 0.15s', 
            border: pendingApprovalsCount > 0 ? 'none' : '1px solid #e5e7eb',
            boxShadow: pendingApprovalsCount > 0 ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none', minWidth: 140
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ fontSize: 20 }}>🔔</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>Approvals</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{pendingApprovalsCount}</span>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/my-pending" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: myPendingFollowupsCount > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f3f4f6', 
            borderRadius: 10, padding: '8px 16px', color: myPendingFollowupsCount > 0 ? '#fff' : '#9ca3af', 
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'transform 0.15s', 
            border: myPendingFollowupsCount > 0 ? 'none' : '1px solid #e5e7eb',
            boxShadow: myPendingFollowupsCount > 0 ? '0 4px 10px rgba(217, 119, 6, 0.2)' : 'none'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ fontSize: 20 }}>📤</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>My Sent Pending</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{myPendingFollowupsCount}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
