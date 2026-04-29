// ============================================================
// lib/auth.js — Role definitions & access control
// NOTE: user_registry ใช้ column ชื่อ "user_role" (ไม่ใช่ current_role)
//       เพราะ current_role เป็น Reserved Keyword ใน PostgreSQL
// ============================================================

// Role Tiers
export const TIER1_ROLES = ['administrator', 'supervisor']
export const TIER2_ROLES = ['approval', 'guest']
export const ALL_ROLES = [...TIER1_ROLES, ...TIER2_ROLES]

// Map ค่าเดิมในฐานข้อมูล → role ใหม่ในระบบ
export const ROLE_MAP = {
  superuser:     'administrator',
  user:          'supervisor',
  visitor:       'guest',
  // ค่าใหม่ที่ Map ตัวเอง
  administrator: 'administrator',
  supervisor:    'supervisor',
  approval:      'approval',
  guest:         'guest',
}

// สิทธิ์เข้าถึงแต่ละ Route (เรียงจาก specific → general)
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
  // เรียงจาก specific → general (path ยาวกว่า = เฉพาะเจาะจงกว่า)
  const sorted = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [route, allowedRoles] of sorted) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(role)
    }
  }
  return false
}

// แปลง role เดิม → role ใหม่
export function normalizeRole(rawRole) {
  if (!rawRole) return 'guest'
  return ROLE_MAP[rawRole.toLowerCase()] || rawRole.toLowerCase()
}

// สีและ Label สำหรับแสดงผล Badge
export const ROLE_BADGE = {
  administrator: { label: 'Administrator', bg: '#fee2e2', color: '#991b1b', emoji: '👑' },
  supervisor:    { label: 'Supervisor',    bg: '#dbeafe', color: '#1e40af', emoji: '🛡️' },
  approval:      { label: 'Approval',      bg: '#fef3c7', color: '#92400e', emoji: '✅' },
  guest:         { label: 'Guest',         bg: '#f3f4f6', color: '#374151', emoji: '👤' },
}
