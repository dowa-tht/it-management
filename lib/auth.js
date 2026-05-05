import crypto from 'crypto'

// ============================================================
// lib/auth.js — Role definitions & access control
// ============================================================

// ฟังก์ชันสำหรับ Hash อีเมลเพื่อใช้ในระบบ Whitelist
export function hashEmail(email) {
  if (!email) return null
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

// Role Tiers
export const TIER1_ROLES = ['administrator', 'supervisor']
export const TIER2_ROLES = ['approval', 'guest']
export const ALL_ROLES = [...TIER1_ROLES, ...TIER2_ROLES]

// Map ค่าเดิมในฐานข้อมูล → role ใหม่ในระบบ
export const ROLE_MAP = {
  superuser:     'administrator',
  administrator: 'administrator',
  supervisor:    'supervisor',
  approval:      'approval',
  guest:         'guest',
  visitor:       'guest',
  user:          'guest', // 🛡️ ปลอดภัยไว้ก่อน
}

// สิทธิ์เข้าถึงแต่ละ Route
export const ROUTE_PERMISSIONS = {
  '/dashboard/settings/users':        ['administrator'],
  '/dashboard/settings/master-data':  ['administrator'],
  '/dashboard/settings/no-series':    ['administrator'],
  '/dashboard/settings/working-hours':['administrator'],
  '/dashboard/settings':              ['administrator'],
  '/dashboard/profile':               ['administrator', 'supervisor'],
  '/dashboard/reports':               ['administrator', 'supervisor'],
  '/dashboard/incidents':             ['administrator', 'supervisor', 'guest'],
  '/dashboard/backup':                ['administrator', 'supervisor', 'guest'],
  '/dashboard/checklist':             ['administrator', 'supervisor', 'guest'],
  '/dashboard':                       ['administrator', 'supervisor', 'guest'],
}

// ตรวจสอบว่า role นี้เข้า pathname ได้หรือไม่
export function canAccess(role, pathname) {
  const sorted = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [route, allowedRoles] of sorted) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(role)
    }
  }
  return false
}

// รายชื่ออีเมลที่ต้องห้ามเข้าใช้งานระบบโดยเด็ดขาด
export const BLACKLIST_EMAILS = [
  'admin_dtt@dowa-tht.co.th',
]

// แปลง role เดิม → role ใหม่
export function normalizeRole(rawRole, email = null) {
  if (email && BLACKLIST_EMAILS.includes(email.toLowerCase())) {
    return null
  }
  if (!rawRole) return 'guest'
  const role = rawRole.toLowerCase()
  return ROLE_MAP[role] || role
}

// สีและ Label สำหรับแสดงผล Badge
export const ROLE_BADGE = {
  administrator: { label: 'Administrator', bg: '#fee2e2', color: '#991b1b', emoji: '👑' },
  supervisor:    { label: 'Supervisor',    bg: '#dbeafe', color: '#1e40af', emoji: '🛡️' },
  approval:      { label: 'Approval',      bg: '#fef3c7', color: '#92400e', emoji: '✅' },
  guest:         { label: 'Guest',         bg: '#f3f4f6', color: '#374151', emoji: '👤' },
}
