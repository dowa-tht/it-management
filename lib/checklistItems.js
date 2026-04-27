export const CHECKLIST_TEMPLATES = {
  Daily: [
    { key: 'm365_health', label: 'ตรวจสอบ M365 Service Health', category: 'Microsoft 365' },
    { key: 'meraki', label: 'ตรวจสอบ Cisco Meraki Dashboard', category: 'Network' },
    { key: 'aruba', label: 'ตรวจสอบ HPE Aruba Instant On Site Health', category: 'Network' },
    { key: 'cctv', label: 'ตรวจสอบกล้อง CCTV Online / Recording', category: 'CCTV' },
    { key: 'nas_health', label: 'ตรวจสอบ Synology NAS Health / Storage', category: 'Server & NAS' },
    { key: 'user_license', label: 'จัดการ User / License (พนักงานเข้า-ออก)', category: 'Microsoft 365' },
  ],
  Weekly: [
    { key: 'm365_signin', label: 'ตรวจสอบ M365 Sign-in Log', category: 'Microsoft 365' },
    { key: 'backup_verify', label: 'ทดสอบและตรวจสอบความสมบูรณ์ของระบบ Backup', category: 'Server & NAS' },
  ],
  Monthly: [
    { key: 'firmware', label: 'Firmware Review (Meraki / Aruba / Yeastar)', category: 'Network' },
    { key: 'ups_test', label: 'ทดสอบระบบไฟสำรอง (UPS)', category: 'Infrastructure' },
    { key: 'server_patch', label: 'ตรวจสอบและอัปเดต Server Patch', category: 'Server & NAS' },
  ],
  Yearly: [
    { key: 'dr_drill', label: 'ซ้อมแผนกู้คืนระบบ (DR Drill)', category: 'Infrastructure' },
    { key: 'checkmk', label: 'ตรวจสอบและปรับปรุง CheckMK Host / Service Status', category: 'Network' },
    { key: 'asset_audit', label: 'ตรวจนับทรัพย์สิน IT ประจำปี', category: 'General' },
  ]
}
