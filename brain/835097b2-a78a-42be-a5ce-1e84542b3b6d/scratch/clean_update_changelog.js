const fs = require('fs');
const filePath = 'c:\\Users\\Lenovo\\dowa-it-system\\docs\\history\\CHANGELOG.md';

const newContent = `# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

### 🚀 11-May-2026 (Morning Session)
- **Incident Workflow Standardization**: กำหนดมาตรฐานขั้นตอนการอนุมัติสำหรับทุกลำดับความรุนแรง (Low/Medium: IT -> Requester, High: IT -> Auditor -> Manager)
- **Dynamic Role Engine**: พัฒนาระบบ \`reporter\` role injection ใน Workflow Engine ให้สามารถดึงข้อมูลผู้แจ้งมาเป็นผู้อนุมัติได้อัตโนมัติ
- **UI Consistency Fix**: แก้ไขปัญหา Progress Bar หายในเคส Low/Medium โดยการบังคับให้ทุก Severity ต้องมีขั้นตอนการทำงาน (Step)
- **Agent Governance**: บันทึกกฎการทำงานใหม่ลงใน \`AGENTS.md\` (Double-verification & Detailed Planning) เพื่อยกระดับคุณภาพงาน

### 🚀 10-May-2026 (Afternoon Session)
- **Workflow & SLA Transparency**: เพิ่มการแสดงผล Workflow Steps (Approver Preview) ในหน้าจอ Incident Detail
- **Sequence Mapping Fix**: แก้ไขปัญหาเลขที่เอกสาร (Case Number) ซ้ำโดยการเพิ่มระบบ Lock ใน No Series
- **RLS Setting Fix**: แก้ไขปัญหาการเข้าถึงหน้าจอ Workflow Config สำหรับ Admin

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 11-May-2026 (Incident Workflow Standardization Completed)*
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('CHANGELOG.md has been clean-written and updated.');
