'use client'

/**
 * 🛠️ WorkflowActionBar (Unified Component)
 * Smart action bar that displays context-aware buttons based on user role and workflow state.
 */
export function WorkflowActionBar({ 
  status, 
  canEdit = true,
  canSubmit, 
  canApprove,
  canRemoteApprove,
  canReject, 
  canReopen,
  canAcknowledge = false,
  acknowledgeLabel = '⚡ รับเรื่อง (Accept)',
  onSave, 
  onSubmit, 
  onApprove,
  onRemoteApprove,
  onReject, 
  onReopen,
  onEdit,
  isEditing,
  onCancelEdit,
  onAcknowledge,
  loading 
}) {
  const isDraft = status === 'Open' || status === 'In Progress'
  const isPending = status === 'Pending Approval'
  const isClosed = status === 'Closed'

  return (
    <>
      <style>{`
        .workflow-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border-top: 1px solid #e2e8f0;
          padding: 12px 20px;
          z-index: 100;
          box-shadow: 0 -10px 25px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        @media (min-width: 1025px) {
          .workflow-action-bar {
            left: 240px; /* Sidebar width */
          }
        }
        @media (max-width: 768px) {
          .workflow-action-bar {
            padding: 10px 12px;
          }
          .workflow-status-text {
            display: none; /* Hide status text on small screens to save space */
          }
          .action-buttons-group {
            width: 100%;
            justify-content: center !important;
          }
        }
      `}</style>
      
      <div className="workflow-action-bar">
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          {/* Left Side: Status Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '10px', height: '10px', borderRadius: '50%', 
              background: isClosed ? '#10b981' : isPending ? '#f59e0b' : '#3b82f6' 
            }} />
            <span className="workflow-status-text" style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              สถานะ: {status}
            </span>
          </div>

          {/* Right Side: Actions */}
          <div className="action-buttons-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isEditing ? (
              <>
                <button
                  onClick={onCancelEdit}
                  disabled={loading}
                  style={{ padding: '8px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#64748b', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={onSave}
                  disabled={loading}
                  style={{ padding: '8px 24px', borderRadius: '10px', background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', fontFamily: 'inherit', fontSize: '13px' }}
                >
                  💾 บันทึก
                </button>
              </>
            ) : (
              <>
                {/* Draft Actions */}
                {isDraft && (
                  <>
                    {status === 'Open' && canAcknowledge && (
                      <button
                        onClick={onAcknowledge}
                        disabled={loading}
                        style={{ padding: '8px 24px', borderRadius: '10px', background: 'linear-gradient(to right, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)', fontFamily: 'inherit', fontSize: '13px', marginRight: '8px' }}
                      >
                        {acknowledgeLabel}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={onEdit}
                        disabled={loading}
                        style={{ padding: '8px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#64748b', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                      >
                        ✏️ แก้ไข
                      </button>
                    )}
                    {canSubmit && (
                      <button
                        onClick={onSubmit}
                        disabled={loading}
                        style={{ padding: '8px 24px', borderRadius: '10px', background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', fontFamily: 'inherit', fontSize: '13px' }}
                      >
                        🚀 ส่งขออนุมัติ
                      </button>
                    )}
                  </>
                )}

                {/* Approval Actions */}
                {isPending && (
                  <>
                    {canApprove && (
                      <>
                        <button
                          onClick={onReject}
                          disabled={loading}
                          style={{ padding: '8px 20px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                        >
                          ❌ ตีกลับ
                        </button>
                        <button
                          onClick={onApprove}
                          disabled={loading}
                          style={{ padding: '8px 24px', borderRadius: '10px', background: 'linear-gradient(to right, #059669, #0d9488)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', fontFamily: 'inherit', fontSize: '13px' }}
                        >
                          ✅ อนุมัติงาน
                        </button>
                      </>
                    )}
                    {canRemoteApprove && (
                      <button
                        onClick={onRemoteApprove}
                        disabled={loading}
                        style={{ padding: '8px 20px', borderRadius: '10px', background: '#475569', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(71, 85, 105, 0.2)', fontFamily: 'inherit', fontSize: '13px' }}
                      >
                        🔏 อนุมัติแทน (Remote)
                      </button>
                    )}
                  </>
                )}

                {/* Closed Actions */}
                {isClosed && canReopen && (
                  <button
                    onClick={onReopen}
                    disabled={loading}
                    style={{ padding: '8px 20px', borderRadius: '10px', border: '1px solid #fde68a', background: '#fffbeb', color: '#d97706', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                  >
                    🔓 Reopen Case
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
