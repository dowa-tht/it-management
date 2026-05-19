# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 19 พฤษภาคม 2569 (19-May-2026)
- **📌 สิ่งที่ต้องดำเนินการต่อ/แจ้งเตือนผู้ใช้งานในวันพรุ่งนี้ (Next Day Reminders & Pending Tasks):**
  - **09:31 +07:00 | MODEL SUITABILITY CHECK (ALL AGENTS):** เพิ่มข้อบังคับตรวจความเหมาะสมของ model ทุก prompt และต้องรอการยืนยันจาก USER เมื่อ model ไม่เหมาะกับงานความเสี่ยงสูง
    - อัปเดต [AGENTS.md](AGENTS.md:1) เพิ่มหัวข้อ `Model Suitability Check (Mandatory)` พร้อม format แจ้งเตือน `> [!IMPORTANT] Model Suitability Alert`
    - อัปเดต [.julesrules](.julesrules:40) เพิ่มกฎบังคับเดียวกัน เพื่อให้ Google Jules หยุดถามยืนยันก่อนลงมือเมื่อ model ไม่เหมาะกับงาน Critical/Complex Debug/Security
    - เพิ่ม default model mapping: Quick = fast model, Standard = coding/balanced model, Critical/Complex Debug/Security = high-reasoning model
  - **09:40 +07:00 | PHOTO COMPRESSION & ONEDRIVE RETAKE CLEANUP:**
    - พัฒนาระบบบีบอัดภาพหลักฐานด้วย HTML5 Canvas บน Client-side ให้จำกัดความยาวด้านสูงสุดที่ `1000px` (ยืดหยุ่นทั้งแนวตั้งและแนวนอนด้วย `Math.max`) และลดคุณภาพการบีบอัดลงมาที่ `0.5` ในไฟล์ `app/dashboard/checklist/[id]/page.js` ช่วยลดขนาดรูปภาพลงกว่า 50% (ประหยัดแบนด์วิดท์เหลือเพียง ~50-90KB ต่อรูป)
    - เพิ่มกระบวนการลบรูปเก่าออกจาก Microsoft OneDrive อย่างปลอดภัย โดยตรวจหา `oldFilePath` ( OneDrive File ID เดิม) และเรียก `DELETE /api/upload/onedrive` แบบ Asynchronous ในพื้นหลัง (Background Fetch) ทันทีที่การอัปโหลดรูปภาพใหม่สำเร็จ เพื่อป้องกันการทิ้งไฟล์ขยะ (Orphaned Files) บน OneDrive

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 19-May-2026*
