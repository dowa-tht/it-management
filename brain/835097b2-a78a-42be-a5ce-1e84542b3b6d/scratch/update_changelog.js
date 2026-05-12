const fs = require('fs');
const path = require('path');
const filePath = 'c:\\Users\\Lenovo\\dowa-it-system\\docs\\history\\CHANGELOG.md';
const content = fs.readFileSync(filePath, 'utf8');

const newEntry = `### 🚀 11-May-2026 (Morning Session)
- **Incident Workflow Standardization**: กำหนดมาตรฐานขั้นตอนการอนุมัติสำหรับทุกลำดับความรุนแรง (Low/Medium: IT -> Requester, High: IT -> Auditor -> Manager)
- **Dynamic Role Engine**: พัฒนาระบบ \`reporter\` role injection ใน Workflow Engine ให้สามารถดึงข้อมูลผู้แจ้งมาเป็นผู้อนุมัติได้อัตโนมัติ
- **UI Consistency Fix**: แก้ไขปัญหา Progress Bar หายในเคส Low/Medium โดยการบังคับให้ทุก Severity ต้องมีขั้นตอนการทำงาน (Step)
- **Agent Governance**: บันทึกกฎการทำงานใหม่ลงใน \`AGENTS.md\` (Double-verification & Detailed Planning) เพื่อยกระดับคุณภาพงาน

`;

const updatedContent = content.replace('### 🚀 10-May-2026 (Afternoon Session)', newEntry + '### 🚀 10-May-2026 (Afternoon Session)');
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('CHANGELOG.md updated successfully.');
