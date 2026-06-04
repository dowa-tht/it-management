# แผนการดำเนินงาน: ปรับคำอธิบาย Scope ของ Checklist Template และรองรับ Template แบบไม่ผูก Target ให้ชัดเจน

**จัดทำเมื่อ:** 2026-05-22 17:06 +07:00  
**สถานะ:** DRAFT — รอ USER ตรวจสอบ  
**โมดูล:** Checklist / Settings / Checklist Template Builder

---

## 1. เป้าหมายของงาน

ปรับหน้า [TemplateForm()](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:22) ให้ผู้ใช้เข้าใจง่ายขึ้นว่า Checklist Template ไม่จำเป็นต้องผูก Target ทุกกรณี โดยเฉพาะ Checklist แบบซ้อมแผน, Procedure walkthrough, และ Checklist กลาง

คำที่ USER อนุมัติให้ใช้บนหน้าจอ:

1. `global` → **ทั่วไป**
2. `per_target` → **ผูกรายอุปกรณ์**
3. `per_type` → **ผูกตามประเภทอุปกรณ์**

นอกจากนี้ต้องปรับ logic ประกอบเพื่อไม่ให้ UI สื่อผิด และลดความเสี่ยงจากข้อมูลค้างใน field target

---

## 2. ปัญหาปัจจุบันจากโค้ดจริง

### 2.1 UI สื่อว่า Template ทุกตัวต้องเกี่ยวกับ Target

หลักฐาน:

- ใน [TemplateForm()](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:349) มี selector ของ `scope_mode`
- ตัวเลือกปัจจุบันใน [TemplateForm.js](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:354) ใช้ข้อความ:
  - `global — ใช้กับทุกเครื่อง`
  - `per_target — ผูกรายอุปกรณ์`
  - `per_type — ผูกรายประเภทอุปกรณ์`
- ช่อง [Target type (Master Data)](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:362) ถูกแสดงตลอด แม้กรณี [scope_mode === 'global'](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:350)

ผลกระทบ:

- ผู้ใช้ตีความว่า Template ทุกตัวต้องเลือกประเภทอุปกรณ์เสมอ
- Checklist แบบซ้อมแผนหรือ Procedure-only ถูกบังคับทาง UX ทั้งที่ backend ไม่ได้บังคับ

### 2.2 Backend ยังรองรับ Template แบบไม่ผูก Target อยู่แล้ว

หลักฐาน:

- [baseTemplateSchema](lib/checklistTemplateValidation.js:89) กำหนด [target_type](lib/checklistTemplateValidation.js:99) เป็น optional/nullable
- [baseTemplateSchema](lib/checklistTemplateValidation.js:102) อนุญาต `targets` เป็น array ว่าง
- ใน [saveChecklistTemplate()](app/actions/checklist-template.js:203) จะตรวจ overlap เฉพาะกรณี [template.scope_mode !== 'global'](app/actions/checklist-template.js:203)
- ใน [saveChecklistTemplate()](app/actions/checklist-template.js:299) ถ้าเป็น `global` จะลบ mapping ทั้งหมดออก

ข้อสรุป:

- ปัญหาหลักอยู่ที่ UX + business validation ยังไม่ชัด ไม่ใช่ schema หลักของระบบ

### 2.3 Flow สร้างเอกสารยังไม่แยก Template ทั่วไปกับ Template ผูกอุปกรณ์

หลักฐาน:

- [fetchAvailableItems()](app/dashboard/checklist/page.js:652) query [checklist_templates](app/dashboard/checklist/page.js:657) ตาม [freq_type](app/dashboard/checklist/page.js:660) อย่างเดียว
- ยังไม่ได้ใช้ [getTemplatesForTarget()](app/actions/checklist-template.js:13) ใน flow สร้างเอกสารจาก modal

ผลกระทบ:

- Template ที่ควรใช้เฉพาะ asset inspection อาจไปโผล่รวมกับ template ทั่วไป
- ถ้าแก้เฉพาะ label อย่างเดียว ปัญหาเชิงความหมายจะดีขึ้น แต่ flow สร้างเอกสารยังไม่ชัด 100%

---

## 3. ขอบเขตการแก้ไขที่เสนอ

### 3.1 ระยะที่ 1 — ปรับภาษาและ UX ให้เข้าใจง่าย

ไฟล์หลัก:

- [app/dashboard/settings/checklist-template-builder/components/TemplateForm.js](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)
- [app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js](app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js)

รายการแก้ไข:

1. เปลี่ยนข้อความใน dropdown `scope_mode`
   - `global` → `ทั่วไป`
   - `per_target` → `ผูกรายอุปกรณ์`
   - `per_type` → `ผูกตามประเภทอุปกรณ์`

2. ปรับคำอธิบาย section [Target scope & mapping](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:342)
   - อธิบายว่า `ทั่วไป` เหมาะกับ checklist กลาง, การซ้อมแผน, procedure walkthrough, policy review
   - อธิบายว่า 2 โหมดที่เหลือใช้เฉพาะกรณีต้องผูกกับอุปกรณ์จริง

3. ซ่อน field [Target type (Master Data)](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js:362) เมื่อเป็น `global`
   - ลดภาพจำว่าต้องเลือก target type ทุกครั้ง

4. แสดง helper note เฉพาะกรณี `global`
   - ตัวอย่างข้อความ: “โหมดทั่วไปใช้สำหรับ Checklist ที่ไม่อ้างอิงอุปกรณ์รายตัว เช่น การซ้อมแผน หรือการตรวจตามขั้นตอนกลาง”

### 3.2 ระยะที่ 2 — ป้องกันข้อมูลค้างจากการสลับโหมด

ไฟล์หลัก:

- [app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js](app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js)

รายการแก้ไข:

1. ปรับ [updateField()](app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js:156)

Technical logic:

```text
if field === 'scope_mode':
  if value === 'global':
    setDraft({
      ...current,
      scope_mode: 'global',
      target_type: null,
      targets: []
    })
  else:
    setDraft({
      ...current,
      scope_mode: value
    })
```

2. เมื่อเปลี่ยน `target_type`
   - คง behavior เดิมที่ reset `targets = []`
   - แต่ต้องให้เกิดเฉพาะตอนอยู่ใน `per_target` หรือ `per_type`

ผลลัพธ์ที่ต้องได้:

- ถ้า user เคยเลือก target ไว้ แล้วเปลี่ยนกลับมาเป็น `ทั่วไป` ระบบต้องล้าง binding เดิมทันที
- ลดความเสี่ยงบันทึก template ทั่วไปแต่แอบมี target data ค้าง

### 3.3 ระยะที่ 3 — เพิ่ม validation เชิงธุรกิจให้ตรงความหมาย

ไฟล์หลัก:

- [lib/checklistTemplateValidation.js](lib/checklistTemplateValidation.js)

รายการแก้ไข:

เพิ่ม cross-field validation หลัง [baseTemplateSchema](lib/checklistTemplateValidation.js:89) หรือใน [validateChecklistTemplate()](lib/checklistTemplateValidation.js:331)

Pseudocode:

```text
if scope_mode === 'global':
  allow target_type = null
  allow targets.length = 0

if scope_mode === 'per_type':
  require target_type not null/empty
  allow targets.length = 0

if scope_mode === 'per_target':
  require target_type not null/empty
  require targets.length >= 1
  require every target.target_id exists
```

ข้อความ error ภาษาไทยที่เสนอ:

- `กรุณาเลือกประเภทอุปกรณ์เมื่อใช้โหมดผูกตามประเภทอุปกรณ์`
- `กรุณาเลือกประเภทอุปกรณ์ก่อนผูกรายอุปกรณ์`
- `กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการเมื่อใช้โหมดผูกรายอุปกรณ์`

เหตุผล:

- ทำให้ business rule ชัดเจนตรงกับสิ่งที่ผู้ใช้เห็นบนหน้าจอ
- ป้องกันการบันทึกข้อมูลครึ่งกลางที่ทำให้ logic downstream สับสน

### 3.4 ระยะที่ 4 — ปรับความหมายใน flow สร้างเอกสารให้สอดคล้อง

ไฟล์หลัก:

- [app/dashboard/checklist/page.js](app/dashboard/checklist/page.js)
- [app/actions/checklist-template.js](app/actions/checklist-template.js)

ข้อเสนอการดำเนินงาน:

#### ระยะ 4A — Quick alignment

ใน [fetchAvailableItems()](app/dashboard/checklist/page.js:652) ให้กรอง template ที่ [scope_mode === 'global'](lib/checklistTemplateValidation.js:98) ก่อน สำหรับ modal สร้างเอกสารแบบทั่วไปปัจจุบัน

Pseudocode:

```text
templates = select checklist_templates where freq_type = selected_freq and is_active = true
available = templates.filter(template => template.scope_mode is null or template.scope_mode === 'global')
```

ผลลัพธ์:

- Modal สร้างเอกสารปกติจะแสดงเฉพาะ Checklist ทั่วไป
- Template ที่ผูกรายอุปกรณ์จะไม่ปะปนใน flow นี้

#### ระยะ 4B — Asset-aware flow ในเฟสถัดไป

สร้าง flow แยกสำหรับ checklist แบบผูก target:

```text
Step 1: เลือก target หรือ scan QR
Step 2: resolve template ผ่าน getTemplatesForTarget(targetId)
Step 3: สร้าง checklist document พร้อม snapshot target context
```

หมายเหตุ:

- ส่วนนี้กระทบ behavior ของโมดูล Checklist มากกว่า Builder จึงควรแยกเป็นงานคนละ step หาก USER ต้องการลดความเสี่ยง

### 3.5 ระยะที่ 5 — อัปเดตเอกสารมาตรฐาน

ไฟล์เอกสารที่ควรอัปเดต:

- [docs/standards/TARGET_REGISTRY.md](docs/standards/TARGET_REGISTRY.md)
- [docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md](docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md)
- [docs/history/CHANGELOG.md](docs/history/CHANGELOG.md)
- [docs/history/USER_TASKS.md](docs/history/USER_TASKS.md)

สาระที่ต้องเพิ่ม:

1. ความหมายใหม่ของ scope label ภาษาไทย
2. นิยามว่า `global/ทั่วไป` = template แบบไม่ผูก target
3. แนวทางใช้งาน:
   - `ทั่วไป` สำหรับซ้อมแผน / procedure walkthrough / checklist กลาง
   - `ผูกรายอุปกรณ์` สำหรับ asset รายตัว
   - `ผูกตามประเภทอุปกรณ์` สำหรับ rollout ตามชนิดอุปกรณ์

---

## 4. ลำดับการลงมือทำที่แนะนำ

### Phase A — Safe UX + Validation

1. ปรับ label และ helper text ใน [TemplateForm.js](app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)
2. ซ่อน field target type เมื่อเป็น `ทั่วไป`
3. ปรับ reset logic ใน [ChecklistTemplateBuilderClient.js](app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js)
4. เพิ่ม validation ใน [lib/checklistTemplateValidation.js](lib/checklistTemplateValidation.js)
5. ทดสอบ builder save flow

### Phase B — Align Checklist Creation Flow

1. ปรับ [fetchAvailableItems()](app/dashboard/checklist/page.js:652) ให้ modal ปัจจุบันแสดงเฉพาะ template ทั่วไป
2. ตรวจผลกระทบกับ duplicate prevention logic ที่ [handleFinalCreate()](app/dashboard/checklist/page.js:695)
3. ทดสอบการสร้างเอกสารจาก template ทั่วไป

### Phase C — Documentation Sync

1. อัปเดตมาตรฐาน [TARGET_REGISTRY.md](docs/standards/TARGET_REGISTRY.md)
2. อัปเดต history docs และ changelog

---

## 5. รายการทดสอบที่ต้องรันหลังแก้ไข

ตาม Tier `Standard` ต้องมีอย่างน้อย targeted verification + lint/tests ที่เกี่ยวข้อง

### 5.1 Manual verification

1. สร้าง template แบบ `ทั่วไป`
   - ไม่ต้องเลือก target type
   - บันทึกได้สำเร็จ
   - reopen มาแก้แล้วค่า target ยังว่าง

2. สร้าง template แบบ `ผูกตามประเภทอุปกรณ์`
   - ถ้าไม่เลือก target type ต้องขึ้น error
   - ถ้าเลือก target type แล้วบันทึกได้

3. สร้าง template แบบ `ผูกรายอุปกรณ์`
   - ถ้าไม่เลือก target type ต้องขึ้น error
   - ถ้าไม่เลือกอุปกรณ์เลยต้องขึ้น error
   - ถ้าเลือกอุปกรณ์แล้วบันทึกได้

4. สลับจาก `ผูกรายอุปกรณ์` → `ทั่วไป`
   - target type และ targets ต้องถูก reset

5. เปิด modal สร้างเอกสารใน [CreateChecklistModal()](app/dashboard/checklist/page.js:597)
   - ต้องเห็นเฉพาะ template แบบ `ทั่วไป` ใน Phase B

### 5.2 Automated checks

1. รัน [npm test](package.json)
2. ถ้ามี lint script ให้รัน [npm run lint](package.json)
3. ถ้าจำเป็น เพิ่ม test ใหม่สำหรับ validation ของ [validateChecklistTemplate()](lib/checklistTemplateValidation.js:331)

---

## 6. ความเสี่ยงและข้อควรระวัง

1. **ความเสี่ยงด้านข้อมูลค้าง**
   - ถ้าแก้เฉพาะ label แต่ไม่ reset field ตอนสลับ `scope_mode` อาจเกิด template `ทั่วไป` ที่ยังมี target_type เดิมค้าง

2. **ความเสี่ยงด้าน flow สร้างเอกสาร**
   - ถ้าไม่กรอง template ใน [CreateChecklistModal()](app/dashboard/checklist/page.js:597) ผู้ใช้จะยังเห็น template ผูกอุปกรณ์ปะปนอยู่

3. **ความเสี่ยงด้าน backward compatibility**
   - Template เก่าที่มี `scope_mode = null` หรือไม่มี field บางตัว ต้อง normalize ให้ fallback เป็น `global` เหมือนเดิมตาม [normalizeTemplateRecord()](lib/checklistTemplateValidation.js:246)

4. **ห้ามทำ UI Hack**
   - ต้องแก้ความหมายที่ source logic และ validation ไม่ใช่แค่เปลี่ยนข้อความแล้วปล่อย behavior ไม่ตรงกัน

---

## 7. ข้อเสนอการอนุมัติเป็น Step

เพื่อให้ความเสี่ยงต่ำและตรวจง่าย แนะนำอนุมัติเป็น 2 ช่วง:

### ช่วงที่ 1

- ปรับคำไทย
- ซ่อน/แสดง field ให้ถูกตาม mode
- reset ค่า target ตอนสลับเป็น `ทั่วไป`
- เพิ่ม validation

### ช่วงที่ 2

- ปรับ flow สร้างเอกสารให้ modal ปกติแสดงเฉพาะ template `ทั่วไป`
- แยกแผน asset-aware creation flow เป็นงานถัดไป

---

## 8. สรุปสำหรับการตัดสินใจ

ถ้าต้องการเริ่มแบบปลอดภัยที่สุด ให้ลงมือเฉพาะ **ช่วงที่ 1** ก่อน เพราะอยู่ในขอบเขต [Checklist Template Builder](app/dashboard/settings/checklist-template-builder/page.js:1) โดยตรงและไม่กระทบ flow สร้างเอกสารหลักมากนัก

ถ้าต้องการให้ความหมายของ “Template ทั่วไป” สมบูรณ์ตั้งแต่ต้นทางถึงปลายทาง ควรทำ **ช่วงที่ 1 + ช่วงที่ 2** ต่อเนื่องกันในงานเดียว
