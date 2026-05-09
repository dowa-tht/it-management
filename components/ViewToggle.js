'use client'

export default function ViewToggle({ mode, onChange }) {
  return (
    <div style={{ 
      display: 'inline-flex', 
      background: '#f1f5f9', 
      padding: '4px', 
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    }}>
      <button 
        onClick={() => onChange('table')}
        style={{
          padding: '6px 12px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          background: mode === 'table' ? '#fff' : 'transparent',
          color: mode === 'table' ? '#1d4ed8' : '#64748b',
          boxShadow: mode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        <span>📄</span> List
      </button>
      <button 
        onClick={() => onChange('grid')}
        style={{
          padding: '6px 12px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          background: mode === 'grid' ? '#fff' : 'transparent',
          color: mode === 'grid' ? '#1d4ed8' : '#64748b',
          boxShadow: mode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        <span>🔲</span> Grid
      </button>
    </div>
  )
}
