export const CHECKLIST_TEMPLATES = {
  Daily: [
    { key: 'm365_health', label: 'ตรวจสอบ M365 Service Health', category: 'Microsoft 365', instruction: 'เข้าหน้า admin.microsoft.com > Health > Service health เพื่อเช็คว่ามีบริการใดขัดข้องหรือไม่' },
    { key: 'meraki', label: 'ตรวจสอบ Cisco Meraki Dashboard', category: 'Network', instruction: 'เช็คสถานะ Security Appliance และ Switch ว่าเป็นสีเขียวทั้งหมดหรือไม่' },
    { key: 'aruba', label: 'ตรวจสอบ HPE Aruba Instant On Site Health', category: 'Network', instruction: 'เช็คในแอป Aruba Instant On ว่าสถานะ Site เป็น Normal หรือไม่' },
    { key: 'cctv', label: 'ตรวจสอบกล้อง CCTV Online / Recording', category: 'CCTV', instruction: 'เปิดหน้าจอ Monitor เช็คว่ากล้องทุกตัวแสดงภาพและมีการบันทึก (Rec)' },
    { key: 'nas_health', label: 'ตรวจสอบ Synology NAS Health / Storage', category: 'Server & NAS', instruction: 'เข้า DSM > Storage Manager เช็คสถานะ Storage Pool และ Drive เป็น Healthy' },
    { key: 'user_license', label: 'จัดการ User / License (พนักงานเข้า-ออก)', category: 'Microsoft 365', instruction: 'ตรวจสอบอีเมลแจ้งพนักงานเข้า-ออก เพื่อ Add/Remove User และ License' },
  ],
  Weekly: [
    { key: 'm365_signin', label: 'ตรวจสอบ M365 Sign-in Log', category: 'Microsoft 365', instruction: 'เช็ค Sign-in logs ใน Entra ID ค้นหาการล็อกอินที่ผิดปกติหรือล้มเหลวจำนวนมาก' },
    { key: 'backup_verify', label: 'ทดสอบและตรวจสอบความสมบูรณ์ของระบบ Backup', category: 'Server & NAS', instruction: 'สุ่มกู้คืนไฟล์ (Restore Test) จาก Backup ล่าสุดเพื่อเช็คความสมบูรณ์ของข้อมูล' },
  ],
  Monthly: [
    { key: 'firmware', label: 'Firmware Review (Meraki / Aruba / Yeastar)', category: 'Network', instruction: 'ตรวจสอบว่ามี Firmware Update สำคัญหรือไม่ หากมีให้วางแผนอัปเดต' },
    { key: 'ups_test', label: 'ทดสอบระบบไฟสำรอง (UPS)', category: 'Infrastructure', instruction: 'กดปุ่ม Test ที่หน้าเครื่อง UPS หรือผ่านซอฟต์แวร์ เพื่อเช็คสถานะแบตเตอรี่' },
    { key: 'server_patch', label: 'ตรวจสอบและอัปเดต Server Patch', category: 'Server & NAS', instruction: 'รัน Windows Update บน Server และติดตั้ง Security Patch ที่จำเป็น' },
  ],
  Yearly: [
    { key: 'dr_drill', label: 'ซ้อมแผนกู้คืนระบบ (DR Drill)', category: 'Infrastructure', instruction: 'ดำเนินการซ้อมกู้คืนระบบตามแผน Disaster Recovery ประจำปี และบันทึกผล' },
    { key: 'checkmk', label: 'ตรวจสอบและปรับปรุง CheckMK Host / Service Status', category: 'Network', instruction: 'Review รายการ Host และ Service ในระบบ Monitor ปรับปรุงให้เป็นปัจจุบัน' },
    { key: 'asset_audit', label: 'ตรวจนับทรัพย์สิน IT ประจำปี', category: 'General', instruction: 'นับจำนวนคอมพิวเตอร์และอุปกรณ์ IT ทั้งหมดเปรียบเทียบกับทะเบียนทรัพย์สิน' },
  ]
}
