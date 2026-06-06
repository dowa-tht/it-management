'use client'
import { useState } from 'react'

export function ActionButton({ onClick, icon, color, title, disabled }) {
  const [hover, setHover] = useState(false)
  
  const colors = {
    blue: { bg: '#eff6ff', icon: '#2563eb', hover: '#dbeafe' },
    red: { bg: '#fef2f2', icon: '#dc2626', hover: '#fee2e2' },
    gray: { bg: '#f8fafc', icon: '#64748b', hover: '#f1f5f9' },
    green: { bg: '#f0fdf4', icon: '#16a34a', hover: '#dcfce7' },
    amber: { bg: '#fffbeb', icon: '#d97706', hover: '#fef3c7' }
  }
  
  const theme = colors[color] || colors.gray
  
  return (
    <button
      data-readonly-allowed={disabled ? undefined : 'true'}
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 34, height: 34, borderRadius: 10, border: 'none',
        background: disabled ? '#f1f5f9' : (hover ? theme.hover : theme.bg),
        color: disabled ? '#cbd5e1' : theme.icon, 
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: (hover && !disabled) ? 'translateY(-2px)' : 'none',
        boxShadow: (hover && !disabled) ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
      }}
    >
      {icon}
    </button>
  )
}
