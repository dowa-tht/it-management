# SLA Management Standard

**Version**: 1.0 (2026-05-09)
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
| **🔴 High** | ทันที (ภายใน 60 นาที) | ภายใน 4 ชั่วโมงทำการ |
| **🟠 Medium** | ภายใน 2 ชั่วโมงทำการ | ภายใน 8 ชั่วโมงทำการ |
| **🟢 Low** | ภายใน 4 ชั่วโมงทำการ | ภายใน 24 ชั่วโมงทำการ (3 วันทำการ) |

> [!IMPORTANT]
> **Resolution Limit for Low Severity**: กำหนดไว้ที่ **1,620 นาที** (9 ชม. x 3 วัน) โดยไม่นับรวมเวลา 24 ชม. เต็ม เพื่อให้สอดคล้องกับเวลาเข้างานจริง

---

## 3. Calculation Logic (Algorithm)

### 3.1 Net Business Minutes
การคำนวณจะใช้ฟังก์ชัน `calculateNetBusinessMinutes` ใน `lib/slaUtils.js` ซึ่งมีเงื่อนไขดังนี้:
1.  ข้ามวันหยุดเสาร์-อาทิตย์
2.  ข้ามวันหยุดนักขัตฤกษ์ในตาราง `sla_holidays`
3.  นับเฉพาะเวลาในช่วง 08:30 - 17:30
4.  หักลบเวลาที่อยู่ในช่วง **Exclusions** (เช่น การรอข้อมูลจากผู้ใช้ หรือการพักเบรคตามตาราง `sla_exclusions`)

### 3.2 Data Resiliency (Fallbacks)
เพื่อให้ระบบแสดงผลได้เสถียรแม้ข้อมูลใน Database บางฟิลด์จะขาดหาย (Legacy Data) ระบบจะใช้ลำดับการอ้างอิงเวลาดังนี้:

**สำหรับ Response Time End:**
1.  `acknowledged_at` (เวลาที่รับงานจริง)
2.  `assigned_at` (เวลาที่ถูกมอบหมาย)
3.  **Fallback**: หากมีชื่อผู้รับผิดชอบ (`assigned_to`) แต่ไม่มี Timestamp ข้างต้น ให้ใช้ `created_at` (ถือว่ารับงานทันที)

---

## 4. UI/UX Standards
- **Color Coding**: 
    - 🟢 OK: ภายในเป้าหมาย
    - 🟠 Warning: ใกล้ถึงกำหนด (ยังไม่ได้ใช้งาน)
    - 🔴 Over SLA: เกินกำหนดเป้าหมาย
- **Real-time Tracking**: หน้า Incident Detail ต้องแสดงนาฬิกานับถอยหลังหรือนับเวลาที่ใช้ไปแบบ Real-time โดยใช้ `SLAWidget` component

---
*จัดทำมาตรฐานโดย AI Agent (Antigravity)*
