# Implementation Plan — Unified SLA Settings & Calculation Standard

**Status:** Draft for Human Review  
**Created:** 2026-05-27 17:53 ICT  
**Scope:** Setup, Incident, Dashboard, SLA Report  
**Criticality:** Critical — Cross-module SLA calculation and setup contract

---

## 1. Objective

รวมการตั้งค่าและการคำนวณ SLA ให้เป็นมาตรฐานกลางทั้งระบบ เพื่อให้ Dashboard, SLA Report และ Incident Detail ใช้สูตรเดียวกัน แสดงผลตรงกัน และแก้ไข logic ได้จากจุดเดียว

เป้าหมายหลัก:

1. เพิ่มหน้า Settings SLA กลางที่ `/dashboard/settings/sla`
2. ย้าย `SLA Compliance Criteria` ออกจาก modal ของหน้า SLA Report ไปอยู่ใน Settings
3. รวม `SLA Exclusion Reason` ไว้ในหน้า Settings SLA เดียวกัน
4. ทำให้ `Pending Approval` หยุดนับ Resolution SLA ชั่วคราว และถ้า Reject/Reopen ให้กลับมานับต่อ
5. รวมสูตรคำนวณ SLA ไว้ใน helper กลาง ไม่กระจาย logic หลายไฟล์

---

## 2. Evidence from Current System

### 2.1 SLA Exclusion Reason exists in Incident Master Data

- `app/dashboard/settings/_components/MasterDataScope.js` มี `Incident Setup`
- `sla_exclusion_reason` ถูกประกาศเป็น master data item
- guide ระบุว่าใช้เป็นเหตุผลหยุดนับเวลา SLA

### 2.2 SLA Compliance Criteria is currently inside SLA Report modal

- `app/dashboard/reports/sla/page.js` มี `SLAGuideModal()`
- modal แสดงหัวข้อ `เกณฑ์การคำนวณ SLA Compliance`
- modal มี edit form สำหรับ Response / Resolution targets
- modal เรียก `saveSLASettings()` จาก `app/actions/reports.js`

### 2.3 Settings navigation does not have SLA Settings

ปัจจุบัน `System Setup` ใน `app/dashboard/layout.js` มี:

1. No. Series
2. Working Hours
3. Holidays

ยังไม่มี `SLA Settings`

### 2.4 Standards already define stop-the-clock behavior

- `docs/standards/SLA_MANAGEMENT.md` ระบุ `SLA Exclusions (Stop the clock)`
- `docs/standards/INCIDENT_MANAGEMENT.md` ระบุ `Pending Approval` ต้องหยุดนับ Resolution SLA

---

## 3. Target Architecture

```text
/dashboard/settings/sla
  ├─ SLA Targets / เกณฑ์ SLA Compliance
  ├─ SLA Exclusion Reason
  ├─ SLA Calculation Policy
  └─ Read-only summary ของ Working Hours / Holidays พร้อม link ไปหน้าเดิม
```

แนวทางนี้ทำให้:

- Setup SLA อยู่ที่เดียว
- Report เป็น read-only analytics ไม่ใช่จุดตั้งค่า
- Dashboard / Report / Detail ใช้สูตรเดียวกัน
- ไม่ต้องแก้ calculation หลายจุดเมื่อ policy เปลี่ยน

### SLA Evaluation Contract (Locked by USER, 2026-05-28)

1. `Response SLA` = `created_at -> acknowledged_at` เท่านั้น (no pause)
2. `Resolution SLA` = `acknowledged_at || assigned_at -> resolved_at` และหัก pause จาก `incident_exclusions`
3. `Pending Approval` pause ได้เฉพาะ Resolution SLA
4. `Reject/Reopen` ต้องปิด pause window เดิมและให้นับ Resolution ต่อ
5. ยังไม่ `acknowledged` = `N/A` (not evaluated) สำหรับ Response
6. ประเมิน SLA % รวมเฉพาะ incident ที่ `status = Closed`
7. `Cancelled` ให้ exclude ออกจากการคำนวณทั้งหมด
8. คะแนนต่อ incident (เฉพาะเคสที่ evaluate):
   - ผ่านทั้ง Response + Resolution = `1.0`
   - ผ่านเพียงด้านเดียว = `0.5`
   - ไม่ผ่านทั้งสองด้าน = `0.0`

---

## 4. Implementation Phases

### Phase 1 — Create centralized SLA Settings page

#### New file

- `app/dashboard/settings/sla/page.js`

#### Page sections

1. **SLA Targets / Compliance Criteria**
   - High / Medium / Low
   - Response target
   - Resolution target
   - input เป็น ชั่วโมง + นาที

2. **SLA Exclusion Reason**
   - ใช้ข้อมูล `master_data.type = 'sla_exclusion_reason'`
   - เพิ่ม / แก้ไข / Active-Inactive ได้
   - ไม่ต้องสร้างตารางใหม่

3. **SLA Calculation Policy**
   - Response: นับจากเปิดเคสถึงรับเรื่อง
   - Resolution: นับจากรับเรื่องถึงแก้ไขเสร็จ
   - Pending Approval: หยุดนับ Resolution SLA ชั่วคราว
   - Reject/Reopen: กลับมานับต่อ
   - Exclusion Reason: ใช้หยุดนับเมื่อ delay ไม่ได้เกิดจาก IT

4. **Working Hours / Holidays summary**
   - แสดง working hours แบบ read-only
   - link ไปหน้า Working Hours และ Holidays

#### UI rule

หน้า `/dashboard/settings/*` ต้องใช้ inline style ตามมาตรฐาน `docs/standards/INLINE_STYLE_STANDARD.md` เนื่องจาก Tailwind JIT อาจไม่ generate class ใน Settings module

---

### Phase 2 — Add SLA Settings menu after Holidays

#### File

- `app/dashboard/layout.js`

#### New System Setup order

```text
System Setup
  No. Series
  Working Hours
  Holidays
  SLA Settings
```

---

### Phase 3 — Move SLA Criteria out of SLA Report modal

#### File

- `app/dashboard/reports/sla/page.js`

#### Changes

1. ปรับปุ่ม `?` ให้เป็น read-only help หรือ link ไป `/dashboard/settings/sla`
2. เอา edit form SLA targets ออกจาก `SLAGuideModal()`
3. หน้า report ไม่ควร save SLA settings โดยตรง
4. `saveSLASettings()` ควรถูกย้ายความรับผิดชอบออกจาก `app/actions/reports.js` ไปยัง setup/settings action

---

### Phase 4 — Create central SLA Settings Server Actions

#### Recommended new file

- `app/actions/sla-settings.js`

#### Functions

1. `getSLASettingsPageData()`
   - โหลด `system_settings.sla_limits`
   - โหลด `system_settings.working_hours`
   - โหลด `master_data` type `sla_exclusion_reason`
   - โหลด holidays summary หรือ count

2. `saveSLATargets(payload)`
   - validate High/Medium/Low Response/Resolution เป็น integer minutes
   - upsert `system_settings.key = 'sla_limits'`

3. `saveSLAExclusionReason(payload)` หรือ reuse master data pattern เดิม
   - เพิ่ม/แก้ไข `master_data.type = 'sla_exclusion_reason'`
   - ไม่สร้างตารางใหม่

---

### Phase 5 — Create single source of truth for SLA calculation

#### File

- `lib/slaUtils.js`

#### Add central helpers

```js
normalizeSlaLimits(value)
getIncidentSlaLimits(settingsValue, severity)
calculateIncidentSlaSnapshot(incident, options)
calculateSlaScoreFromSnapshot(snapshot)
```

#### Snapshot contract

```js
{
  responseMin,
  resolveMin,
  responseLimit,
  resolveLimit,
  isResponseOK,
  isResolveOK,
  isSlaPassed,
  incidentScore,
  isEvaluated,
  responseStatus,
  resolutionStatus,
  pauseMinutes,
  activePause
}
```

#### Policy

1. **Response SLA**
   - start = `created_at`
   - end = `acknowledged_at` เท่านั้น
   - ไม่ใช้ pause และไม่ fallback ไป `assigned_at`
   - ถ้ายังไม่ acknowledged = `N/A` (not evaluated)

2. **Resolution SLA**
   - start = `acknowledged_at || assigned_at`
   - end = `resolved_at`
   - หัก `incident_exclusions`
   - ถ้า status = `Pending Approval` ให้หยุดนับที่ active pause window
   - ถ้า Reject/Reopen ให้ปิด pause window แล้วเริ่มนับต่อ

3. **Scoring / Compliance**
   - คิดเฉพาะ incident ที่ `status = Closed` และไม่ใช่ `Cancelled`
   - score ต่อ incident: both pass=`1.0`, pass one=`0.5`, none=`0.0`
   - `complianceRate = (sum(score) / evaluatedCount) * 100`

---

### Phase 6 — Bind Pending Approval to SLA pause windows

#### Files to inspect and modify carefully

- `app/actions/workflow.js` — `submitRequest()`
- `app/actions/workflow.js` — `rejectDocumentWorkflow()`
- `app/actions/workflow.js` — `resetDocumentWorkflow()`
- `app/actions/workflow.js` — `submitApprovalStep()`

#### Data strategy

ใช้ตารางเดิม `incident_exclusions` เป็น pause window กลางในรอบแรก ไม่สร้างตารางใหม่

#### Logic

1. เมื่อ Incident submit เข้า `Pending Approval`
   - insert `incident_exclusions`
   - `start_time = now`
   - `end_time = null`
   - `reason_id` = reason ของ system เช่น `Pending Approval`
   - `notes = 'System pause: Pending Approval'`

2. เมื่อ Reject หรือ Reopen
   - หา active exclusion ของ incident ที่ `end_time IS NULL`
   - update `end_time = now`

3. เมื่อ Closed final
   - ปิด active exclusion ด้วย `end_time = now`

> ต้องตรวจ workflow transition จริงใน `app/actions/workflow.js` ก่อน implement เพราะ final status อาจถูก update ผ่าน helper/RPC ห้ามเดา

---

### Phase 7 — Replace duplicated SLA calculations

#### Dashboard summary

- `app/actions/dashboard.js` helper ภายใน `calculateSlaForIncident` ต้องถูกแทนด้วย `calculateIncidentSlaSnapshot()`

#### SLA report

- `app/actions/reports.js` calculation blocks ต้องถูกแทนด้วย helper กลาง
- หน้า report ต้องแสดง `N/A` เมื่อยังไม่ evaluate (เช่นยังไม่ acknowledged)

#### Dashboard card

- `app/dashboard/DashboardClient.js` ต้องเลิก hardcode `SLA_MINUTES`
- `getSLAStatus()` ควรรับ snapshot จาก server หรือใช้ normalized limits จาก server

#### Incident detail

- `app/dashboard/incidents/[id]/page.js` `SLAWidget()` ต้อง pause-aware
- Resolution widget ต้องใช้ logic เดียวกับ report
- ห้ามคำนวณ SLA ซ้ำใน widget แบบ logic แยก ให้ใช้ snapshot จาก helper กลาง

---

### Phase 8 — Documentation sync

#### Files to update

- `docs/standards/SLA_MANAGEMENT.md`
- `docs/standards/INCIDENT_MANAGEMENT.md`
- `docs/standards/FUNCTION_REGISTRY.md`
- `docs/INDEX.md`
- `docs/history/CHANGELOG.md`

---

## 5. Testing Plan

Because this is Critical, full verification is required.

### Targeted tests

1. `calculateNetBusinessMinutes()` ยังทำงานเดิม
2. `calculateIncidentSlaSnapshot()` กรณียังไม่ acknowledged = Response `N/A`
3. `calculateIncidentSlaSnapshot()` กรณี Closed และผ่านเฉพาะด้านเดียว = score `0.5`
4. Pending Approval มี active exclusion แล้ว Resolution ไม่เพิ่ม
5. Reject/Reopen ปิด exclusion แล้วกลับมานับต่อ
6. Closed ใช้เวลาหลังหัก exclusion ได้ถูกต้อง
7. `Cancelled` ไม่ถูกนำไปคำนวณ SLA %
8. Closed ผ่านครบสองด้าน = score `1.0`, ไม่ผ่านทั้งคู่ = `0.0`

### Integration checks

1. `/dashboard/settings/sla` โหลดและบันทึก SLA targets ได้
2. SLA Report อ่านค่า settings จากที่เดียว
3. Dashboard card ไม่ใช้ hardcoded SLA target
4. Incident detail แสดง pause-aware SLA ตรงกับ report
5. SLA Report list แสดง `N/A` ถูกต้องสำหรับเคสที่ยังไม่ evaluate

### Required command

```bash
npm test
```

ควรรัน `npm run build` เพิ่มตาม Windsurf Build Before Ship ถ้าสภาพแวดล้อมพร้อม

---

## 6. Final Recommendation

ให้ implement ตามแนวทางนี้:

1. สร้าง `/dashboard/settings/sla` เป็นศูนย์กลาง Setup SLA
2. รวม SLA Exclusion Reason และ SLA Compliance Criteria ในหน้านี้
3. ทำ report modal เป็น read-only/help/link ไป settings
4. ใช้ `incident_exclusions` เป็น pause window โดยไม่สร้างตารางใหม่ในรอบแรก
5. รวมสูตรทั้งหมดไว้ใน `lib/slaUtils.js`
6. เปลี่ยน dashboard/report/detail ให้ใช้ snapshot จาก helper เดียวกัน
7. Compliance ใช้ per-incident scoring (`1.0/0.5/0.0`) และคิดเฉพาะ Closed (Cancelled excluded)

แนวทางนี้ตรงกับ requirement ที่ต้องการ setup ที่เดียว, แก้ครั้งเดียวไม่กระจายหลายที่, และ performance ดีกว่า derive จาก logs ทุกครั้ง

---

## 7. Execution Log

### 2026-05-27 21:59 ICT — Phase 1 partial execution paused by USER

#### สถานะการทำงาน

- **Phase:** Phase 1 — Create centralized SLA Settings page
- **สถานะ:** กำลังดำเนินการ / ยังไม่ปิดเฟส
- **USER directive ล่าสุด:** ให้บันทึก log การทำงานลงไฟล์นี้ เนื่องจากการทำงานช้าผิดปกติและใช้เวลานานเกินไป

#### สิ่งที่ทำไปแล้วจริง

1. อ่าน preflight ตาม Critical task:
   - `docs/standards/FUNCTION_REGISTRY.md`
   - `docs/INDEX.md`
   - `docs/history/USER_TASKS.md`
   - `docs/standards/SLA_MANAGEMENT.md`
   - `docs/standards/INLINE_STYLE_STANDARD.md`
   - `docs/history/IMPLEMENTATION_PLAN_UNIFIED_SLA_SETTINGS_AND_CALCULATION.md`
2. ตรวจพบความกำกวมของแผน:
   - Phase 1 ต้องสร้างหน้า `/dashboard/settings/sla`
   - แต่ Phase 4 จึงค่อยสร้าง Server Actions สำหรับโหลด/บันทึกข้อมูล
   - เพื่อไม่ขัดมาตรฐาน “Client Component ห้าม fetch ข้อมูลโดยตรง” จึงถาม USER ก่อน
3. USER ยืนยันแนวทาง:
   - ทำ Phase 1 เป็น **UI read-only** ก่อน
   - ยังไม่ทำ save/load จริง จนกว่าจะถึง Phase 4
4. สร้างไฟล์ใหม่:
   - `app/dashboard/settings/sla/page.js`
5. เนื้อหาไฟล์ที่สร้าง:
   - หน้า SLA Settings แบบ read-only
   - แสดง SLA Targets / Compliance Criteria จาก `SLA_LIMITS`
   - แสดง SLA Exclusion Reason แบบ static placeholder
   - แสดง SLA Calculation Policy
   - แสดง Working Hours / Holidays summary พร้อม link ไปหน้าเดิม
   - ใช้ inline style ตาม `docs/standards/INLINE_STYLE_STANDARD.md`

#### สิ่งที่ยังไม่ได้ทำ

1. ยังไม่ได้เพิ่มเมนูใน `app/dashboard/layout.js` — เป็น Phase 2 ตามแผน
2. ยังไม่ได้ทำ real data loading / saving — USER ระบุให้รอ Phase 4
3. ยังไม่ได้รัน test / lint / build
4. ยังไม่ได้ปิด Phase 1
5. ยังไม่ได้บันทึกสถานะ “แก้ไขแล้ว” และ “user อนุมัติให้ทำ step ถัดไป” สำหรับ Phase 1 เพราะ Phase 1 ยังไม่ได้สรุปและยังไม่ได้รับ approval เพื่อไป step ถัดไป

#### เหตุผลที่หยุด

หยุดตามคำสั่ง USER เพื่อบันทึก log การทำงานก่อนดำเนินการต่อ และยอมรับว่าการทำงานในรอบนี้ใช้เวลานานเกินไปเมื่อเทียบกับขอบเขต Phase 1 แบบ read-only

---

### 2026-05-27 22:11 ICT — Phase 1 ปิดสมบูรณ์ / USER อนุมัติ Phase 2

#### ✅ Phase 1: แก้ไขแล้ว (COMPLETED)

หลักฐานที่ตรวจสอบ:
- `app/dashboard/settings/sla/page.js` มีอยู่ 424 บรรทัด — ครบตาม spec
- ใช้ inline style ตาม `INLINE_STYLE_STANDARD.md` ทั้งหมด ✓
- import `SLA_LIMITS` จาก `lib/slaUtils.js` line 82 — export ถูกต้อง ✓
- แสดง SLA Targets (High/Medium/Low), SLA Calculation Policy, Exclusion Reason, Working Hours link ✓
- รัน `npm test`: 12/16 passed — 4 tests ที่ fail ไม่เกี่ยวกับ Phase 1 SLA (เป็น test ของ feature อื่นที่ค้างมาก่อน ไม่ใช่ regression จากงานนี้)

สิ่งที่ Phase 1 defer ไป Phase ถัดไปโดยเจตนา:
- ยังไม่เพิ่มเมนูใน layout.js → Phase 2
- ยังไม่ทำ real data loading/saving → Phase 4

#### ✅ USER อนุมัติให้ทำ Phase 2 (APPROVED)

- USER เลือก option 2: ข้าม 4 tests ที่ไม่เกี่ยวข้อง ถือว่า Phase 1 เสร็จสมบูรณ์
- อนุมัติดำเนินการ **Phase 2 — Add SLA Settings menu after Holidays** ใน `app/dashboard/layout.js`
- Timestamp: 2026-05-27 22:11 ICT

---

### 2026-05-27 22:14 ICT — Phase 2 เสร็จสมบูรณ์ / รอ USER อนุมัติ Phase 3

#### ✅ Phase 2: แก้ไขแล้ว (COMPLETED)

ไฟล์ที่แก้ไข: `app/dashboard/layout.js`

การเปลี่ยนแปลง:
1. เพิ่ม `{ href: '/dashboard/settings/sla', label: 'SLA Settings', feature: 'settings' }` ใน `system_setup.items` (line 137) — อยู่หลัง Holidays ตามแผน
2. เพิ่ม `|| pathname.includes('/sla')` ใน expand condition (line 103) — ให้ sidebar auto-expand System Setup เมื่อเปิดหน้า SLA Settings

ผลลัพธ์หลังแก้ไข:
- `npm test`: 12/16 passed — ไม่มี regression ใหม่เพิ่ม ✓
- เมนู SLA Settings ปรากฏใน System Setup group ต่อจาก Holidays ✓
- Sidebar expand อัตโนมัติเมื่อเข้า `/dashboard/settings/sla` ✓

### 2026-05-27 22:23 ICT — Phase 3 เสร็จสมบูรณ์ / USER อนุมัติ Phase 4

#### ✅ Phase 3: แก้ไขแล้ว (COMPLETED)

ไฟล์ที่แก้ไข: `app/dashboard/reports/sla/page.js`

การเปลี่ยนแปลง:
1. ลบ import `saveSLASettings` จาก `@/app/actions/reports`
2. ลบ state และ function ที่เกี่ยวข้องกับการแก้ไข (isEditing, editedSettings, handleSave)
3. เปลี่ยน `SLAGuideModal` ให้เป็น read-only และแสดงปุ่มนำทางไปยังหน้า SLA Settings แทนฟอร์มการแก้ไข

ผลลัพธ์หลังแก้ไข:
- `npm test`: 12/16 passed — ไม่มี regression ใหม่เพิ่ม ✓
- หน้า Report ปรากฏปุ่ม "⚙️ ไปที่ SLA Settings" นำทางไปตั้งค่า SLA ในจุดเดียวตามมาตรฐาน single source of truth ✓

#### ✅ USER อนุมัติให้ทำ Phase 4 (APPROVED)

- อนุมัติดำเนินการ **Phase 4 — Create central SLA Settings Server Actions** เพื่อสร้าง Server Actions สำหรับจัดการ SLA
- Timestamp: 2026-05-27 22:23 ICT

---

### 2026-05-28 15:xx ICT — Requirement lock before Phase 4 (USER-confirmed)

#### ✅ SLA contract locked ก่อนเริ่ม implement Phase 4

- Response SLA: `created_at -> acknowledged_at` เท่านั้น, no pause
- Resolution SLA: `acknowledged_at || assigned_at -> resolved_at`, pause-aware
- ยังไม่ acknowledged = `N/A` (not evaluated)
- SLA % คิดเฉพาะ `Closed`
- `Cancelled` ถูก exclude ออกจากการคำนวณ
- Per-incident score: `1.0 / 0.5 / 0.0`
