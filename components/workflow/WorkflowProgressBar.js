'use client'

/**
 * 📊 WorkflowProgressBar (Unified Component)
 * Standardized progress bar for both Incident and Checklist modules.
 * Fixed for stability and consistent layout.
 */
export function WorkflowProgressBar({ currentStatus, steps = [] }) {
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

      {/* Detail Approval Steps */}
      {steps.length > 0 && currentStatus === 'Pending Approval' && (
        <div style={{ 
          marginTop: '40px', 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px', 
          flexWrap: 'wrap' 
        }}>
          {steps.map((step, idx) => (
            <div 
              key={step.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                borderRadius: '8px', 
                background: step.status === 'approved' ? '#f0fdf4' : (step.status === 'pending' ? '#eff6ff' : '#f8fafc'),
                border: `1px solid ${step.status === 'approved' ? '#bbf7d0' : (step.status === 'pending' ? '#bfdbfe' : '#e2e8f0')}`,
                color: step.status === 'approved' ? '#166534' : (step.status === 'pending' ? '#1e40af' : '#64748b'),
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <span style={{ 
                width: '16px', height: '16px', borderRadius: '50%', 
                background: step.status === 'approved' ? '#10b981' : (step.status === 'pending' ? '#3b82f6' : '#94a3b8'),
                color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {step.status === 'approved' ? '✓' : idx + 1}
              </span>
              {step.role_required}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
