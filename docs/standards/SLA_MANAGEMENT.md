# SLA Management Standard

**Version**: 1.1 (2026-05-28)
**Status**: Mandatory Standard
**Scope**: Incident Management & SLA Reporting

---

## 1. Working Hours Configuration
ระบบคำนวณ SLA จะทำงานภายใต้ช่วงเวลาทำการมาตรฐานของบริษัท เพื่อความยุติธรรมในการวัดผล KPI (Response/Resolution Time)

- **Standard Hours**: 08:30 - 17:30 (9 ชั่วโมงต่อวัน)
- **Work Days**: จันทร์ - ศุกร์
- **Exclusions**: วันหยุดนักขัตฤกษ์ (ตามตาราง `sla_holidays`) และวันเสาร์-อาทิตย์

---

## 2. SLA Thresholds (KPI)

| Severity | Response Target | Resolution Target |
| :--- | :--- | :--- |
| **🔴 High** | 60 นาที | 240 นาที (4 ชม. ทำการ) |
| **🟠 Medium** | 120 นาที (2 ชม. ทำการ) | 480 นาที (8 ชม. ทำการ) |
| **🟢 Low** | 360 นาที (6 ชม. ทำการ) | 1,620 นาที (3 วันทำการ) |

> [!IMPORTANT]
> **Resolution Limit for Low Severity**: กำหนดไว้ที่ **1,620 นาที** (9 ชม. x 3 วัน) โดยไม่นับรวมเวลา 24 ชม. เต็ม เพื่อให้สอดคล้องกับเวลาเข้างานจริง

---

## 3. SLA Exclusions (Stop the clock)
เพื่อความเป็นธรรมในการวัดผล ระบบจะหยุดนับเวลา (Pause SLA) ในกรณีต่อไปนี้:
- **Waiting for Vendor**: อยู่ระหว่างรอการสนับสนุนจากผู้ผลิตหรือผู้ให้บริการภายนอก
- **Waiting for spare parts**: อยู่ระหว่างรออะไหล่หรืออุปกรณ์ทดแทน
- **External events**: เหตุสุดวิสัยภายนอก (ไฟฟ้าดับทั้งนิคม, ISP ล่ม, ภัยธรรมชาติ)
- **System pause: Pending Approval**: pause อัตโนมัติเมื่อ Incident เข้า `Pending Approval`

---

## 4. Calculation Logic (Algorithm)

### 3.1 Net Business Minutes
การคำนวณจะใช้ฟังก์ชัน `calculateNetBusinessMinutes` ใน `lib/slaUtils.js` ซึ่งมีเงื่อนไขดังนี้:
1.  ข้ามวันหยุดเสาร์-อาทิตย์
2.  ข้ามวันหยุดนักขัตฤกษ์ในตาราง `sla_holidays`
3.  นับเฉพาะเวลาในช่วง 08:30 - 17:30
4.  หักลบเวลาที่อยู่ในช่วง **Exclusions** (เช่น การรอข้อมูลจากผู้ใช้ หรือการพักเบรคตามตาราง `sla_exclusions`)

### 3.3 Unified Evaluation Contract (Reporting)
ใช้มาตรฐานเดียวสำหรับ Dashboard / SLA Report / Incident Detail:

1. **Response SLA**
   - start = `created_at`
   - end = `acknowledged_at` เท่านั้น
   - ยังไม่ acknowledged = `N/A` (not evaluated)
   - ไม่ใช้ pause กับ Response

2. **Resolution SLA**
   - start = `acknowledged_at || assigned_at`
   - end = `resolved_at`
   - หักเวลาจาก `incident_exclusions` (รวม `Pending Approval`)

3. **Compliance Score per Incident**
   - evaluate เฉพาะ `status = Closed`
   - `Cancelled` = excluded
   - ผ่านทั้ง Response + Resolution = `1.0`
   - ผ่านเพียงด้านเดียว = `0.5`
   - ไม่ผ่านทั้งสองด้าน = `0.0`

4. **Overall Compliance (%)**
   - `sum(score) / evaluatedCount * 100`

---

## 4. UI/UX Standards
- **Color Coding**: 
    - 🟢 OK: ภายในเป้าหมาย
    - 🟠 Warning: ใกล้ถึงกำหนด (ยังไม่ได้ใช้งาน)
    - 🔴 Over SLA: เกินกำหนดเป้าหมาย
- **Real-time Tracking**: หน้า Incident Detail ต้องแสดงนาฬิกานับถอยหลังหรือนับเวลาที่ใช้ไปแบบ Real-time โดยใช้ `SLAWidget` component

---
*จัดทำมาตรฐานโดย AI Agent (Antigravity), อัปเดตสัญญาคำนวณรวมศูนย์โดย Codex (2026-05-28)*
