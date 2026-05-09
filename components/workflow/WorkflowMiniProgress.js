'use client'

export default function WorkflowMiniProgress({ steps = [] }) {
  if (!steps || steps.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
      <style>{`
        @keyframes pulse-blue {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .step-pulse {
          animation: pulse-blue 2s infinite ease-in-out;
        }
      `}</style>
      {steps.map((step, idx) => {
        let color = '#e2e8f0' // waiting
        let isPulse = false
        
        if (step.status === 'approved') {
          color = '#10b981' // green
        } else if (step.status === 'pending') {
          color = '#3b82f6' // blue
          isPulse = true
        } else if (step.status === 'rejected') {
          color = '#ef4444' // red
        }

        return (
          <div 
            key={step.id || idx}
            className={isPulse ? 'step-pulse' : ''}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: color,
              transition: 'background 0.3s'
            }}
            title={`${step.role_required}: ${step.status}`}
          />
        )
      })}
    </div>
  )
}
