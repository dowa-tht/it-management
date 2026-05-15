# Implementation Plan — Checklist Point History & Photo Evidence UI Hardening

**Created:** 2026-05-15 21:21 +07:00  
**Status:** ✅ COMPLETED
**Last Updated:** 2026-05-15 22:50 +07:00
**Scope:** ปรับปรุงหน้า [`app/dashboard/checklist/[id]/page.js`](app/dashboard/checklist/[id]/page.js) ในส่วน `Photo Evidence` ให้ UX ชัดเจนขึ้น และออกแบบสถาปัตยกรรมใหม่เพื่อรองรับการดูประวัติย้อนหลัง “รายจุดตรวจ” ผ่าน QR Code แบบไม่ใช้ UI Hack

---

## 1. Problem Statement

จากหลักฐานหน้าจอจริงและโค้ดปัจจุบัน พบช่องว่าง 2 กลุ่มหลัก:

1. **Photo Evidence UI ยังสื่อโครงสร้างงานไม่ชัด**
   - หน้า checklist detail ใน [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556) render จุดถ่ายภาพเป็น tile ธรรมดาใน [`points.map((p, idx) => ...)`](app/dashboard/checklist/[id]/page.js:699)
   - ไม่มีการสรุปว่าต้องถ่ายทั้งหมดกี่จุด, ถ่ายแล้วกี่จุด, จุดใดขาด, จุดใดมีพิกัด, หรือจุดใดต้องถ่ายซ้ำ
   - card ด้านบนของ photo options มี hierarchy ไม่สอดคล้องกับภาพใช้งานจริง ทำให้ section “รายการตรวจสอบ” ดูไม่สมดุล

2. **Data model ปัจจุบันยังไม่รองรับ point-level history ผ่าน QR ได้จริง**
   - ปัจจุบันรูปถูกเก็บใน [`template_data.photos`](app/dashboard/checklist/[id]/page.js:605) และ metadata ใน [`template_data.photo_meta`](app/dashboard/checklist/[id]/page.js:606) โดยอิง `pointIdx`
   - มาตรฐานใน [`docs/standards/DOCUMENT_MAPPING_STANDARD.md`](docs/standards/DOCUMENT_MAPPING_STANDARD.md:47) ยืนยันว่าระบบเก็บหลักฐานแยกตาม `point index`
   - แต่ `point index` ไม่ใช่ stable identity สำหรับการดูย้อนหลังข้ามหลายเดือน, ผูก QR, หรือ track จุดเดียวกันในหลาย checklist documents
   - เอกสารแผนหลักก็ยืนยันช่องว่างนี้ใน [`docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`](docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md:105) โดยระบุว่ายังไม่มี asset-centric history และ QR foundation data model

---

## 2. Current Evidence From Source Code

### 2.1 Rendering Layer

- [`TemplateRenderer()`](app/dashboard/checklist/[id]/page.js:492) เลือก `T1` ไปยัง [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:496)
- [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556) อ่านจุดจาก [`config.photo_points`](app/dashboard/checklist/[id]/page.js:557)
- UI upload zone แสดงผลต่อจุดใน [`points.map((p, idx) => ...)`](app/dashboard/checklist/[id]/page.js:699)
- การ preview และ location badge ถูกผูกกับ `idx` โดยตรงใน [`data.photos[idx]`](app/dashboard/checklist/[id]/page.js:706) และ [`data.photo_meta?.[idx]`](app/dashboard/checklist/[id]/page.js:701)

### 2.2 Persistence Layer

- ตอนอัปโหลดสำเร็จ ระบบเขียนรูปไปยัง [`photos[pointIdx]`](app/dashboard/checklist/[id]/page.js:605)
- metadata ของแต่ละจุดถูกเขียนไปยัง [`photo_meta[pointIdx]`](app/dashboard/checklist/[id]/page.js:606)
- metadata ต่อจุดที่เก็บจริงตอนนี้มี:
  - [`file_id`](app/dashboard/checklist/[id]/page.js:609)
  - [`status`](app/dashboard/checklist/[id]/page.js:610)
  - [`lat`](app/dashboard/checklist/[id]/page.js:611)
  - [`lng`](app/dashboard/checklist/[id]/page.js:612)
  - [`accuracy`](app/dashboard/checklist/[id]/page.js:613)
  - [`captured_at`](app/dashboard/checklist/[id]/page.js:614)
  - [`point_label`](app/dashboard/checklist/[id]/page.js:615)
  - [`message`](app/dashboard/checklist/[id]/page.js:616)

### 2.3 Standards / Architecture Constraints

- [`docs/standards/DOCUMENT_MAPPING_STANDARD.md`](docs/standards/DOCUMENT_MAPPING_STANDARD.md:48) กำหนดให้หลักฐานภาพอยู่ใน `checklist_items.template_data`
- [`docs/standards/DOCUMENT_MAPPING_STANDARD.md`](docs/standards/DOCUMENT_MAPPING_STANDARD.md:49) ระบุว่า `photos` ใช้เก็บ OneDrive file id แยกตาม point index
- [`docs/standards/DOCUMENT_MAPPING_STANDARD.md`](docs/standards/DOCUMENT_MAPPING_STANDARD.md:71) บังคับ snapshot-first ห้าม render ย้อนหลังจาก master config อย่างเดียว
- [`docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`](docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md:109) และ [`...:110`](docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md:110) ระบุว่า point-level / asset-level history ยังไม่มี foundation data model

---

## 3. Target Outcomes

เมื่อจบงานนี้ ระบบต้องได้ผลลัพธ์ดังนี้:

1. หน้า checklist detail ของ T1 อ่านง่ายและสื่อชัดว่า template นี้มี “กี่จุด”
2. ผู้ใช้มองเห็นสถานะของแต่ละจุดได้ทันที เช่น ยังไม่ถ่าย / ถ่ายแล้ว / มีพิกัด / ไม่มีพิกัด
3. ระบบมี stable point identity ที่ไม่อิงแค่ `array index`
4. สามารถต่อยอด QR ต่อ “จุดตรวจ” ได้จริง เช่น “จุดที่ 1 ของตู้ A”
5. สามารถสร้างหน้าดูย้อนหลังเฉพาะ point เดียวได้ เช่น “CCTV Box A → Point 01 → ประวัติทุกเดือน”
6. เอกสาร checklist เก่าที่ยังไม่มี point identity ใหม่ ต้องยังเปิดดูได้โดยไม่เสียข้อมูลเดิม

---

## 4. Non-Negotiable Design Rules For Fast AI

Fast AI ต้องยึดกฎต่อไปนี้ห้ามตกหล่น:

1. **ห้ามใช้ UI Hack**
   - ห้ามสร้าง point history จากการเดา label string อย่างเดียว
   - ห้ามใช้ `point index` เป็น long-term identifier สำหรับ QR/history

2. **ต้อง Snapshot-First**
   - เมื่อ checklist document ถูกสร้าง ต้อง snapshot point definition ลงเอกสารด้วย
   - ห้ามอิง master template ปัจจุบันอย่างเดียวเวลาย้อนดูเอกสารเก่า

3. **ต้อง Migration-Safe**
   - เอกสารเก่าที่มีแค่ `photos[index]` และ `photo_meta[index]` ต้องยังอ่านได้
   - เอกสารใหม่ค่อยใช้โครงสร้าง point identity แบบใหม่โดยไม่ทำลายของเดิม

4. **ต้องรองรับทั้ง generic checklist และ target-aware checklist**
   - ไม่บังคับให้ทุก T1 ต้องมี QR รายจุด
   - แต่ T1 ที่ user ต้องการใช้กับ asset history ต้องรองรับได้แบบ canonical

---

## 5. Required Architecture Change

> [!IMPORTANT]
> ห้ามให้ Fast AI ลงมือแก้เฉพาะ UI ของ [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556) โดยไม่เพิ่ม data model ระดับ point identity เพราะจะทำให้หน้าจอดูดีขึ้นแต่ยังไม่แก้ source of truth สำหรับ point-level history

### 5.1 New Concept: Checklist Inspection Point

ต้องแยก “จุดถ่ายภาพ” จาก string label ธรรมดาไปเป็น object ที่มี stable identity

โครงสร้างขั้นต่ำที่แนะนำสำหรับ point definition:

```json
{
  "point_id": "uuid-or-stable-key",
  "point_code": "P01",
  "label": "ภาพหน้าตู้",
  "description": "ถ่ายให้เห็นภาพรวมด้านหน้าและสถานะฝาปิด",
  "sort_order": 1,
  "qr_enabled": true,
  "history_scope": "point"
}
```

### 5.2 Backward Compatibility Strategy

ต้องรองรับ 2 schema พร้อมกันชั่วคราว:

#### Legacy schema
- [`template_config.photo_points`](docs/standards/DOCUMENT_MAPPING_STANDARD.md:66) เป็น `string[]`
- เอกสารเก่าเก็บรูปใน `photos[index]` และ `photo_meta[index]`

#### New schema
- `template_config.photo_points` เปลี่ยนเป็น `object[]` หรือเพิ่ม `photo_point_defs`
- แต่ละ point มี `point_id` / `point_code`
- `template_data.photos_by_point[point_id]`
- `template_data.photo_meta_by_point[point_id]`
- `template_data._snapshot.photo_points[]` ต้องเก็บ definition เต็มของ point ตอนสร้างเอกสาร

### 5.3 Recommended Data Shapes

#### Template master

```json
template_config: {
  "photo_points": [
    {
      "point_id": "p_front_panel",
      "point_code": "P01",
      "label": "ภาพหน้าตู้",
      "description": "ตรวจสภาพฝาตู้และภายนอก",
      "sort_order": 1,
      "qr_enabled": true
    }
  ],
  "min_photos": 6,
  "allow_retake": true,
  "enable_location_toggle": true,
  "watermark": {
    "timestamp": true,
    "user": true,
    "target_code": false
  }
}
```

#### Checklist item snapshot

```json
template_data: {
  "_snapshot": {
    "ui_template_type": 1,
    "config": { ... },
    "photo_points": [
      {
        "point_id": "p_front_panel",
        "point_code": "P01",
        "label": "ภาพหน้าตู้",
        "description": "ตรวจสภาพฝาตู้และภายนอก",
        "sort_order": 1,
        "qr_enabled": true
      }
    ]
  },
  "photos_by_point": {
    "p_front_panel": "onedrive-file-id"
  },
  "photo_meta_by_point": {
    "p_front_panel": {
      "file_id": "onedrive-file-id",
      "point_id": "p_front_panel",
      "point_code": "P01",
      "point_label": "ภาพหน้าตู้",
      "captured_at": "ISO",
      "status": "captured",
      "lat": 0,
      "lng": 0,
      "accuracy": 0,
      "message": ""
    }
  }
}
```

---

## 6. UI/UX Improvement Scope For [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556)

Fast AI ต้องปรับ UI ให้ได้ minimum behavior ดังนี้:

### 6.1 Section Summary Header

ต้องมี summary block ด้านบนของรายการจุดภาพ เช่น:

- จำนวนจุดทั้งหมด
- ถ่ายแล้วกี่จุด
- ขาดอีกกี่จุด
- มีพิกัดกี่จุด
- status ของ template เช่น `ขั้นต่ำ 6 รูป` / `ครบตามข้อกำหนดแล้ว`

### 6.2 Per-Point Card Layout

แต่ละจุดต้อง render เป็น point card ที่มี:

- point code เช่น `P01`
- point label
- optional description
- รูป preview หรือ upload dropzone
- badge สถานะ `ยังไม่ถ่าย / ถ่ายแล้ว / มีพิกัด / ไม่มีพิกัด`
- action `ถ่ายใหม่` ถ้า `allow_retake = true`
- metadata เช่น `captured_at`

### 6.3 Responsive Behavior

- Desktop: 2-3 columns ตามความกว้าง
- Tablet/mobile: 1 column หรือ 2 columns แบบไม่บีบ text
- ห้ามใช้ card square บังคับจนเนื้อหา label ยุบอ่านยากแบบในภาพปัจจุบัน

### 6.4 Evidence-Oriented Visual Hierarchy

ต้องแยกชัดเจนระหว่าง:

- section options (`Attach Location`)
- section summary
- per-point evidence grid
- fullscreen preview

### 6.5 Field/Point Completion Logic

Pseudo logic:

```text
required_count = max(config.min_photos, photo_points.length if all points mandatory)
captured_count = number of points with existing photo
gps_count = number of points with meta.status = captured

if captured_count < required_count
  show warning summary
else
  show success summary
```

---

## 7. Point-Level History & QR Design

### 7.1 What Fast AI Must NOT Do

ห้ามทำหน้า history โดย query จาก `point_label = 'ภาพหลักฐาน 1'` ข้ามหลายเดือน เพราะ:

- label เปลี่ยนได้
- ภาษาเปลี่ยนได้
- index reorder ได้
- template ใหม่อาจใช้ label เดิมคนละความหมาย

### 7.2 Required Point Identity Strategy

ระบบต้องใช้ key ต่อไปนี้อย่างน้อย:

- `target_id` — อุปกรณ์/จุดติดตั้ง
- `template_id` หรือ snapshot template origin
- `point_id` — identity ของจุดตรวจ
- `point_code` — code ที่อ่านง่ายสำหรับ QR / UI

### 7.3 QR Use Case Model

QR สำหรับ “จุดที่ 1” ต้อง resolve ได้อย่างน้อยเป็น:

```json
{
  "target_id": "uuid",
  "point_id": "p_front_panel",
  "point_code": "P01",
  "target_code": "CCTV-TB-001"
}
```

### 7.4 Point History Query Contract

หน้าประวัติรายจุดต้อง query ได้ตาม logic นี้:

```text
INPUT: target_id + point_id

1. find checklist documents of target_id ordered by period_date desc
2. join checklist_items of T1 photo templates
3. read template_data.photo_meta_by_point[point_id]
4. keep only records where point_id exists
5. build timeline grouped by month / document / status
6. render gallery + metadata + map link if coordinates exist
```

### 7.5 Suggested Route Design

- Current asset history route: [`app/dashboard/checklist/targets/[id]/page.js`](app/dashboard/checklist/targets/[id]/page.js)
- New point history route proposal:
  - `/dashboard/checklist/targets/[targetId]/points/[pointId]`

หน้าดังกล่าวต้องมี:

- header target + point info
- latest capture card
- timeline of historical captures
- gallery / compare mode
- incident linkage if point failed repeatedly

---

## 8. Detailed Fast AI Task Breakdown

## TASK-01 — Harden Current T1 UI Without Breaking Existing Data

**Goal:** ปรับ [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556) ให้ UX ชัดขึ้นก่อน โดยยังอ่าน legacy data ได้

### Required changes
- เพิ่ม summary header
- เปลี่ยน square tile เป็น point card
- เพิ่ม point index / code ชั่วคราวจาก `idx + 1`
- แสดง completion count
- แสดง captured timestamp และ location badge ให้เด่นขึ้น
- keep legacy read path:
  - `data.photos[idx]`
  - `data.photo_meta[idx]`

### Done criteria
- ภาพรวม section อ่านง่ายขึ้นชัดเจนจาก screenshot
- ผู้ใช้รู้ทันทีว่ามีกี่จุดและขาดจุดไหน

---

## TASK-02 — Extend Template Builder Schema For Stable Photo Points

**Goal:** ปรับ builder ของ T1 ให้รองรับ point definition แบบ object

### Files likely affected
- [`lib/checklistTemplateValidation.js`](lib/checklistTemplateValidation.js)
- [`app/dashboard/settings/checklist-template-builder/components/TemplateForm.js`](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)
- [`app/dashboard/settings/checklist-template-builder/components/TemplatePreview.js`](app/dashboard/settings/checklist-template-builder/components/TemplatePreview.js)
- [`app/actions/checklist-template.js`](app/actions/checklist-template.js)

### Required changes
- เพิ่ม schema validation ของ point object
- รองรับ migration จาก `string[]` → `object[]`
- builder UI ต้องแก้ไข point ได้ทีละจุด:
  - label
  - description
  - point_code
  - qr_enabled
  - sort_order

### Pseudocode

```text
if incoming photo_points is string[]
  normalize to object[] using generated point_id and point_code

if incoming photo_points is object[]
  validate all fields

ensure point_id unique per template
ensure point_code unique per template
ensure label non-empty
```

---

## TASK-03 — Snapshot Point Definitions Into Checklist Documents

**Goal:** ตอนสร้าง checklist item ต้อง snapshot point definitions ลงเอกสาร

### Files likely affected
- [`app/dashboard/checklist/page.js`](app/dashboard/checklist/page.js)
- จุดสร้าง `_snapshot` ใน logic สร้าง checklist items

### Required changes
- ตอนสร้าง `checklist_items` สำหรับ T1 ให้ copy point definitions ลงใน `template_data._snapshot.photo_points`
- ต้องยังคง `config` เดิมไว้เพื่อ backward compatibility

### Pseudocode

```text
if template.ui_template_type === 1
  snapshot.photo_points = normalized photo point definitions
else
  no change
```

---

## TASK-04 — Write New Per-Point Evidence Storage Shape

**Goal:** ให้เอกสารใหม่บันทึกหลักฐานแบบ point identity ได้

### Required changes
- write both old + new structure in transition phase:
  - legacy: `photos[idx]`, `photo_meta[idx]`
  - new: `photos_by_point[point_id]`, `photo_meta_by_point[point_id]`

### Why dual-write is required
- เพื่อไม่ทำลายหน้าเดิมหรือ query เก่า
- เพื่อให้ migration incremental และ test ง่าย

### Pseudocode

```text
point = snapshot.photo_points[pointIdx]

update template_data with:
  photos[pointIdx] = filePath
  photo_meta[pointIdx] = legacyMeta
  photos_by_point[point.point_id] = filePath
  photo_meta_by_point[point.point_id] = enhancedMeta
```

---

## TASK-05 — Create Point History Read Model

**Goal:** สร้าง server-side loader สำหรับดูย้อนหลังรายจุด

### Files likely affected
- [`app/actions/target.js`](app/actions/target.js) หรือสร้าง action ใหม่เฉพาะ point history
- route/page ใหม่ภายใต้ `app/dashboard/checklist/targets/[targetId]/points/[pointId]/`

### Required output
- latest capture
- historical captures timeline
- source checklist document refs
- image URLs
- location metadata

### Required fallback behavior
- หากเป็นเอกสารเก่าที่ไม่มี `photo_meta_by_point`
  - fallback โดยอ่าน `snapshot.photo_points[idx]` + `photo_meta[idx]`
  - แต่ต้อง mark ว่า record นี้มาจาก `legacy_mapping`

---

## TASK-06 — QR Mapping For Point-Level Navigation

**Goal:** QR 1 code = 1 target point

### Suggested DB direction

Fast AI ยังไม่ควรเดา schema เองลอยๆ แต่ให้ใช้ plan นี้เป็น baseline:

#### Option A — extend target registry
ตารางใหม่เช่น `checklist_target_points`

ขั้นต่ำต้องมี:
- `id`
- `target_id`
- `template_id` nullable
- `point_id`
- `point_code`
- `label`
- `qr_value`
- `is_active`

#### Option B — point registry snapshot table
ใช้ table สำหรับผูก target + point definition โดยตรง

### Required QR lookup behavior

```text
input qr_value
-> resolve target_id + point_id
-> redirect to /dashboard/checklist/targets/[targetId]/points/[pointId]
```

---

## TASK-07 — Tests Fast AI Must Add

### Validation tests
- T1 accepts object-based photo points
- reject duplicate point_id
- reject duplicate point_code
- reject empty label

### Checklist creation tests
- new checklist item snapshots photo_points
- upload writes `photos_by_point` and `photo_meta_by_point`

### Point history tests
- point history loader returns only records for requested `point_id`
- legacy fallback still returns old records when possible

### QR tests
- QR lookup resolves target point correctly
- invalid QR returns 404

---

## 9. Required Documentation Updates

Fast AI ต้องอัปเดตเอกสารทุกจุดที่เกี่ยวข้องเมื่อ implementation เสร็จ:

1. [`docs/standards/DOCUMENT_MAPPING_STANDARD.md`](docs/standards/DOCUMENT_MAPPING_STANDARD.md)
   - เพิ่ม schema ใหม่ของ T1 photo point object
   - เพิ่ม `photos_by_point` / `photo_meta_by_point`

2. [`docs/standards/TARGET_REGISTRY.md`](docs/standards/TARGET_REGISTRY.md)
   - ถ้ามี point registry หรือ point QR mapping

3. [`docs/standards/QR_ASSET_HISTORY.md`](docs/standards/QR_ASSET_HISTORY.md)
   - เพิ่ม flow point-level QR lookup

4. [`docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`](docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md)
   - อัปเดตสถานะว่าระบบรองรับ point-level history ถึงขั้นไหนแล้ว

5. [`docs/history/CHANGELOG.md`](docs/history/CHANGELOG.md)
   - บันทึกทุก step พร้อม timestamp

---

## 10. Execution Order For Fast AI

Fast AI ต้องทำตามลำดับนี้ ห้ามข้าม:

1. **UI Hardening ของ [`PhotoTemplate()`](app/dashboard/checklist/[id]/page.js:556)**
2. **Schema extension ของ T1 ใน builder + validation**
3. **Checklist snapshot update ตอนสร้างเอกสาร**
4. **Dual-write storage for point-based evidence**
5. **Point history read model**
6. **QR point mapping**
7. **Tests**
8. **Documentation sync**

---

## 11. Handoff Notes For Fast AI

### What Fast AI is allowed to change
- code ใน route checklist, builder, target history, validations, tests, docs

### What Fast AI must not decide alone
- final production schema name ของ point registry table
- migration strategy ที่กระทบเอกสารเก่าจำนวนมาก
- QR value canonical format หากยังไม่มีมาตรฐานองค์กรยืนยัน

### Escalate immediately if
- ต้องแก้ schema หลายตารางพร้อมกันแต่ logic point/target mapping ยังไม่ชัด
- พบว่า `target_id` ยังไม่ถูกผูกกับ checklist documents อย่างพอเพียงสำหรับ point history
- legacy documents ไม่สามารถ map point identity ย้อนหลังได้อย่างเชื่อถือ

---

## 12. Success Criteria

งานนี้ถือว่าสำเร็จเมื่อครบทุกข้อ:

1. หน้า checklist detail ของ T1 ดูดีขึ้นชัดเจนจากภาพจริง
2. ผู้ใช้เข้าใจได้ทันทีว่า template นี้มี 6 จุดและถ่ายครบหรือยัง
3. เอกสารใหม่ของ T1 มี stable point identity ใน snapshot/data
4. ระบบสามารถดึงประวัติย้อนหลังเฉพาะจุดเดียวได้จริง
5. QR สามารถพาไปหน้า point-level history ได้
6. เอกสารเก่ายังอ่านได้
7. tests ผ่าน
8. docs sync ครบ

---

## 13. Recommended Next Human Workflow

หากใช้ workflow แยกบทบาท:

- Smart AI ใช้ไฟล์นี้เป็น task file หลักสำหรับแตกงานย่อย
- Fast AI ดำเนินการทีละ TASK-01 → TASK-07
- Human review หลัง TASK-01 และ TASK-04 เป็น checkpoint สำคัญที่สุด เพราะกระทบทั้ง UX และ data model
