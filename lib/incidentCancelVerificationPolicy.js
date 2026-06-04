import { normalizeRole } from '@/lib/auth'

export function deriveIncidentCancelVerificationPolicy({ actorRole, actorId, incident }) {
  const normalizedRole = normalizeRole(actorRole)
  // Reporter account must map from reported_by_id only.
  // If null, treat as external reporter (no account in system).
  const reporterId = incident?.reported_by_id || null
  const hasReporterAccount = Boolean(reporterId)
  const isAdmin = normalizedRole === 'admin'
  const isReporterActor = Boolean(reporterId && actorId === reporterId)
  const isItStaffRole = normalizedRole === 'it_staff'
  const isAssigneeActor = Boolean(actorId && incident?.assigned_to_id && actorId === incident.assigned_to_id)
  const isStaffOrAssignee = isItStaffRole || isAssigneeActor

  // 1) Admin -> own PIN only
  if (isAdmin) {
    return {
      allowed: true,
      mode: 'admin_pin',
      actorLabel: 'Administrator',
      pinLabel: 'PIN ของ Administrator',
      hint: '* ต้องกรอก PIN ของ Administrator เท่านั้น',
      allowPin: true,
      allowOtp: false,
      requirePinOnly: true,
    }
  }

  // 2) Reporter account -> reporter PIN only
  if (isReporterActor) {
    return {
      allowed: true,
      mode: 'reporter_pin',
      actorLabel: 'ผู้แจ้งเหตุ (Reporter)',
      pinLabel: 'PIN ของผู้แจ้ง',
      hint: '* ต้องกรอก PIN ของผู้แจ้งเท่านั้น',
      allowPin: true,
      allowOtp: false,
      requirePinOnly: true,
    }
  }

  // 3) IT Staff / Assignee -> verify as reporter (PIN/OTP), external reporter -> OTP only
  if (isStaffOrAssignee) {
    if (!hasReporterAccount) {
      return {
        allowed: true,
        mode: 'external_reporter_otp',
        actorLabel: 'ผู้แจ้งเหตุภายนอก (External Reporter)',
        pinLabel: '',
        hint: '* ผู้แจ้งภายนอกต้องยืนยันด้วย OTP ทางอีเมลเท่านั้น',
        allowPin: false,
        allowOtp: true,
        requirePinOnly: false,
      }
    }
    return {
      allowed: true,
      mode: 'reporter_pin_or_otp',
      actorLabel: 'ผู้แจ้งเหตุ (Reporter)',
      pinLabel: 'PIN ของผู้แจ้ง',
      hint: '* ต้องใช้ PIN หรือ OTP ของผู้แจ้งเท่านั้น',
      allowPin: true,
      allowOtp: true,
      requirePinOnly: false,
    }
  }

  return {
    allowed: false,
    mode: 'forbidden',
    actorLabel: '',
    pinLabel: '',
    hint: '',
    allowPin: false,
    allowOtp: false,
    requirePinOnly: false,
  }
}
