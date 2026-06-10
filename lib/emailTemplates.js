function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildOnboardingInviteEmail({
  fullName,
  setupUrl,
  isInviteOnly,
  password,
}) {
  const safeName = escapeHtml(fullName || 'ผู้ใช้งาน')
  const safeUrl = escapeHtml(setupUrl)
  const safePassword = escapeHtml(password || '')
  const title = isInviteOnly
    ? 'ยินดีต้อนรับสู่ DOWA IT System'
    : 'ข้อมูลการเข้าใช้งาน DOWA IT System'
  const intro = isInviteOnly
    ? 'คุณได้รับเชิญให้เข้าใช้งานระบบบริหารจัดการไอทีของ DOWA กรุณากดยืนยันตัวตนเพื่อกำหนดรหัสผ่านและ Signature PIN ด้วยตนเอง'
    : 'บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาเข้าสู่ขั้นตอนยืนยันตัวตนและตั้งค่าความปลอดภัยก่อนเริ่มใช้งานจริง'
  const buttonText = isInviteOnly
    ? 'ลงทะเบียนเข้าใช้งาน'
    : 'ตั้งค่าบัญชีและความปลอดภัย'
  const footerNote = isInviteOnly
    ? '* ลิงก์นี้มีอายุ 24 ชั่วโมง'
    : '* เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้เปลี่ยนรหัสผ่านอีกครั้งเพื่อความปลอดภัย'

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#eef4ff; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; width:100%; background-color:#ffffff; border:1px solid #dbe7ff; border-radius:20px;">
            <tr>
              <td style="padding:32px 32px 16px 32px; background:linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); border-bottom:1px solid #e5eefc;">
                <div style="font-size:12px; line-height:18px; font-weight:700; letter-spacing:1px; color:#2563eb; text-transform:uppercase;">DOWA IT System</div>
                <h1 style="margin:12px 0 0 0; font-size:30px; line-height:38px; color:#0f172a; font-weight:800;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px; font-size:16px; line-height:28px; color:#334155;">
                <p style="margin:0 0 16px 0;">สวัสดีคุณ <strong style="color:#0f172a;">${safeName}</strong>,</p>
                <p style="margin:0 0 16px 0;">${intro}</p>
              </td>
            </tr>
            ${
              isInviteOnly
                ? ''
                : `
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#f8fafc; border:1px solid #dbe4f0; border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px; font-size:14px; line-height:24px; color:#334155;">
                      <div style="font-weight:700; color:#0f172a; margin-bottom:6px;">รหัสผ่านชั่วคราว</div>
                      <div style="font-family:Consolas, 'Courier New', monospace; font-size:15px; color:#1d4ed8;">${safePassword}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
            }
            <tr>
              <td style="padding:16px 32px 8px 32px; font-size:15px; line-height:26px; color:#475569;">
                กรุณากดปุ่มด้านล่างเพื่อเปิดหน้า onboarding จาก environment ปัจจุบันของระบบ
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#2563eb" style="border-radius:12px;">
                      <a href="${safeUrl}" style="display:inline-block; padding:14px 28px; font-size:16px; line-height:20px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px;">${buttonText}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 8px 32px; font-size:13px; line-height:22px; color:#64748b;">
                หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px 32px;">
                <div style="word-break:break-all; background-color:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; padding:14px 16px; font-size:13px; line-height:22px; color:#1d4ed8;">
                  ${safeUrl}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px; font-size:12px; line-height:22px; color:#64748b; border-top:1px solid #e5eefc;">
                <div style="padding-top:20px;">${footerNote}</div>
                <div style="padding-top:6px;">หากคุณไม่ได้ร้องขอการใช้งานนี้ กรุณาติดต่อผู้ดูแลระบบทันที</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}
