'use client'

/**
 * 📊 WorkflowProgressBar (Unified Component)
 * Standardized progress bar for both Incident and Checklist modules.
 * Fixed for stability and consistent layout.
 */
export function WorkflowProgressBar({ currentStatus, steps = [], senderName = '', senderEmail = '' }) {
  const STATUS_MAP = {
    'Open': 0,
    'In Progress': 33,
    'Pending Approval': 66,
    'Closed': 100
  }

  const currentProgress = STATUS_MAP[currentStatus] || 0
  
  const stages = [
    { label: 'เปิดงาน', status: 'Open' },
    { label: 'กำลังดำเนินงาน', status: 'In Progress' },
    { label: 'รออนุมัติ', status: 'Pending Approval' },
    { label: 'ปิดงาน', status: 'Closed' }
  ]

  const getRoleFallbackName = (roleRequired) => {
    const role = (roleRequired || '').toLowerCase()
    if (role === 'admin') return 'กลุ่ม Admin (รอรับคิว)'
    if (role === 'approver') return 'กลุ่ม Approver (รอรับคิว)'
    if (role === 'it_staff') return 'กลุ่ม IT Staff (รอรับคิว)'
    if (role === 'reporter') return 'ผู้แจ้งเคส'
    if (role === 'creator') return 'ผู้สร้างเอกสาร'
    return 'ผู้มีสิทธิ์ตามบทบาท (รอรับคิว)'
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      {/* Main Progress Track */}
      <div style={{ position: 'relative', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '30px' }}>
        <div 
          style={{ 
            height: '100%', 
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', 
            borderRadius: '10px',
            width: `${currentProgress}%`,
            transition: 'width 0.6s ease-in-out'
          }}
        />

        {/* Nodes */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', transform: 'translateY(-50%)' }}>
          {stages.map((stage) => {
            const isCompleted = STATUS_MAP[stage.status] <= currentProgress
            const isActive = stage.status === currentStatus
            
            return (
              <div key={stage.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div 
                  style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: isCompleted ? '#10b981' : '#fff',
                    border: `3px solid ${isCompleted ? '#10b981' : '#e2e8f0'}`,
                    boxShadow: isActive ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                    zIndex: 2,
                    transition: 'all 0.3s'
                  }}
                />
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '11px', 
                  fontWeight: 700,
                  color: isCompleted ? '#334155' : '#94a3b8',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  {stage.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Approval Steps (Transparency Box) */}
      {steps.length > 0 && (
        <div style={{ 
          marginTop: '32px', 
          padding: '20px',
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝 ลำดับขั้นตอนการอนุมัติ (Approval Flow)</span>
            {steps.some(s => s.is_preview) && (
              <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>พรีวิว</span>
            )}
          </div>
          {(senderName || senderEmail) && (
            <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sender</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{senderName || '-'}</div>
              {senderEmail ? <div style={{ fontSize: '11px', color: '#64748b' }}>{senderEmail}</div> : null}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map((step, idx) => {
              const isApproved = step.status === 'approved'
              const isPending = step.status === 'pending'
              const name = step.user_profiles?.full_name || getRoleFallbackName(step.role_required)
              const roleLabel = step.role_required?.replace('_', ' ').toUpperCase()
              
              return (
                <div 
                  key={step.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: isApproved ? '#f0fdf4' : (isPending ? '#eff6ff' : '#f8fafc'),
                    border: `1px solid ${isApproved ? '#bbf7d0' : (isPending ? '#bfdbfe' : '#e2e8f0')}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: isApproved ? '#10b981' : (isPending ? '#3b82f6' : '#94a3b8'),
                      color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isApproved ? '✓' : idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isApproved ? '#166534' : (isPending ? '#1e40af' : '#1e293b') }}>
                        {name}
                      </div>
                      {step.user_profiles?.email ? (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {step.user_profiles.email}
                        </div>
                      ) : null}
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        {roleLabel}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    padding: '4px 10px', 
                    borderRadius: '20px',
                    background: isApproved ? '#dcfce7' : (isPending ? '#dbeafe' : '#f1f5f9'),
                    color: isApproved ? '#16a34a' : (isPending ? '#2563eb' : '#64748b'),
                    textTransform: 'uppercase'
                  }}>
                    {isApproved ? 'อนุมัติแล้ว' : (isPending ? 'รออนุมัติ' : 'ยังไม่ถึงคิว')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
