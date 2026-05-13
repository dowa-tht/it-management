# Settings Design System Standard

**Status:** Active Standard  
**Scope:** ทุกหน้าภายใต้ `/dashboard/settings/*`  
**Reference Page:** `/dashboard/settings/permissions`  
**Last Updated:** 2026-05-13 16:58

---

## 1. วัตถุประสงค์

เอกสารนี้กำหนดมาตรฐาน UI/UX สำหรับเมนู Settings ทั้งหมด โดยใช้หน้า Permission Management เป็น reference หลัก เนื่องจากมี layout ที่เหมาะกับงานตั้งค่าระบบ: อ่านง่าย, มี hierarchy ชัด, action อยู่ในตำแหน่งคาดเดาได้, และรองรับข้อมูลแบบ matrix ได้ดี

มาตรฐานนี้ไม่ได้บังคับให้ทุกหน้า Settings ต้องหน้าตาเหมือนกันทั้งหมด แต่บังคับให้มี design language เดียวกัน และเลือก layout pattern ให้เหมาะกับชนิดข้อมูลของแต่ละเมนู

---

## 2. Evidence จากโค้ดจริง

### 2.1 Permission Management เป็น Reference หลัก

- `app/dashboard/settings/permissions/page.js:L82` ใช้ container กลาง `maxWidth: '1200px'`, padding ผ่าน `--page-padding`, และ margin auto
- `app/dashboard/settings/permissions/page.js:L84-L98` กำหนด responsive rule สำหรับจอ <= 768px: padding 12px, header stack, action เต็มความกว้าง, title 22px, table min-width 800px
- `app/dashboard/settings/permissions/page.js:L101-L109` ใช้ page header แบบ icon tile + title + subtitle
- `app/dashboard/settings/permissions/page.js:L112-L142` ใช้ action dock ด้านขวา มี reset/save และเปลี่ยน visual state เมื่อมี unsaved changes
- `app/dashboard/settings/permissions/page.js:L145-L156` ใช้ alert banner สำหรับ status feedback
- `app/dashboard/settings/permissions/page.js:L159-L166` ใช้ glass/table card: white translucent, radius 24px, border อ่อน, shadow ลึก
- `app/dashboard/settings/permissions/page.js:L167-L235` ใช้ table wrapper แบบ overflow-x auto และ table matrix ที่คงความกว้างขั้นต่ำ
- `app/dashboard/settings/permissions/page.js:L200-L203` กำหนดสีสถานะ permission: `RW`, `RO`, `NONE`
- `app/dashboard/settings/permissions/page.js:L239-L258` มี help/legend card สำหรับอธิบายความหมายของสิทธิ์

### 2.2 Navigation Settings ปัจจุบัน

- `app/dashboard/layout.js:L128-L174` แบ่ง Settings เป็น 5 กลุ่ม: System Setup, Master Data, Workflow & Approval, Users & Access, Audit & Logs
- `app/dashboard/layout.js:L329-L331` กำหนด sidebar active state ด้วย background สีน้ำเงินเข้มโปร่ง, font weight 700, และ left border `#3b82f6`

### 2.3 Responsive Pattern จากหน้า Settings อื่น

- `app/dashboard/settings/users/page.js` ใช้ users table `min-width: 850px` บน mobile
- `app/dashboard/settings/logs/page.js` ใช้ logs table `min-width: 800px` บน mobile
- `app/dashboard/settings/holidays/page.js` ใช้ form stack และ holidays table `min-width: 620px` บน mobile
- `app/dashboard/settings/approvals/page.js` ใช้ approvals table `min-width: 600px` บน mobile
- `app/dashboard/settings/substitutes/page.js` ใช้ substitutes table `min-width: 700px` บน mobile
- `app/dashboard/settings/no-series/page.js` ใช้ no-series table `min-width: 650px` บน mobile
- `app/dashboard/settings/working-hours/page.js` ใช้ focused setup form และ time grid เปลี่ยนเป็น 1 column บน mobile
- `app/dashboard/settings/workflow/page.js` ใช้ workflow layout แบบ 2-pane desktop และต้อง collapse อย่างเป็นระบบบน tablet/mobile

---

## 3. Design Principles

1. **Operational First:** Settings เป็นหน้าทำงานจริง ไม่ใช่ landing page จึงต้องเน้นความชัด, ความเร็วในการ scan, และ action ที่คาดเดาได้
2. **Same Language, Different Layout:** ทุกหน้าต้องใช้สี, spacing, header, card, table, button และ feedback pattern เดียวกัน แต่เลือกโครงสร้างตามชนิดงาน
3. **No Master Data Wrapper Dependency:** เมนู Settings ที่เป็นงานคนละประเภทต้องเป็น route แยก ไม่ซ้อนด้วย query wrapper เช่น `/dashboard/settings/master-data?type=...`
4. **Responsive By Structure:** tablet และ smartphone ต้องเปลี่ยน layout ด้วย breakpoint และ content priority ไม่ใช้การย่อ font ตาม viewport
5. **No UI Hacks:** ห้ามแก้ display ให้ดูถูกต้องเฉพาะหน้า หากข้อมูลหรือสถานะไม่ตรงมาตรฐาน ต้องแก้ที่ source of truth หรือทำ migration

---

## 4. Information Architecture ของ Settings

Settings sidebar ต้องยึดกลุ่มหลักดังนี้:

| Group | Menus | Purpose |
| --- | --- | --- |
| System Setup | No. Series, Working Hours, Holidays | ค่าพื้นฐานระบบ, วันทำงาน, วันหยุด, running number |
| Master Data | Incident Master Data, Checklist Master Data | ข้อมูลอ้างอิงสำหรับ Incident และ Checklist |
| Workflow & Approval | Workflow Rules, Approval Flows, Substitute Approvers | กฎ workflow, สายอนุมัติ, ผู้อนุมัติแทน |
| Users & Access | Users, Permissions | ผู้ใช้, role, permission matrix |
| Audit & Logs | System Logs | ประวัติการใช้งาน, audit trail |

ทุกเมนูที่ปรากฏใน sidebar ต้องชี้ไป route จริงแบบ standalone เช่น `/dashboard/settings/holidays` ไม่ชี้ไป wrapper พร้อม query string

---

## 5. Page Shell Standard

### 5.1 Container

| Viewport | Padding | Container |
| --- | --- | --- |
| Desktop >= 1200px | `32px 24px` หรือ `24px` | centered, `max-width` ตาม page type |
| Tablet 769-1199px | `24px 20px` | centered, grid ลด column |
| Smartphone <= 768px | `16px 12px` | full width, card/table ชิดขอบอย่างตั้งใจ |

`max-width` มาตรฐาน:

| Page Type | Max Width |
| --- | --- |
| Matrix / large table | `1200px` |
| User/log/admin table | `1200px` |
| Focused setup form | `800px - 900px` |
| Workflow builder | `1200px` |
| Modal form | `520px - 720px` |

### 5.2 Header

Header ของทุกหน้า Settings ต้องมี:

- icon tile ขนาด `40px x 40px`, radius `12px`
- title desktop `28px / 800 / #0f172a`
- title mobile `22px / 800 / #0f172a`
- subtitle `13px - 15px / #64748b`
- letter spacing ต้องเป็น `0`
- action area อยู่ขวาบน desktop และ stack เต็มความกว้างบน mobile

### 5.3 Header Actions

Action dock ใช้เมื่อมีหลายปุ่มหรือมี save state:

- background `white`
- border `1px solid #e2e8f0`
- radius `20px`
- padding `6px`
- shadow ปกติอ่อน และเพิ่ม shadow เมื่อมี unsaved changes
- primary action ใช้ blue gradient `#1d4ed8 -> #3b82f6`
- disabled action ใช้ `#e2e8f0` และ text `#94a3b8`

สำหรับหน้าที่มี action เดียว ให้ใช้ปุ่มปกติ ไม่จำเป็นต้องสร้าง action dock

---

## 6. Component Standards

### 6.1 Cards

- background `#ffffff` หรือ translucent white สำหรับ table card
- border `1px solid #e2e8f0`
- radius `20px - 24px`
- shadow อ่อน: `0 4px 12px rgba(15, 23, 42, 0.06)`
- ห้ามวาง card ซ้อน card หากไม่ได้เป็น modal, repeated item, หรือ framed tool ที่จำเป็นจริง

### 6.2 Tables

Table ทุกหน้าต้องอยู่ใน horizontal scroll wrapper บน mobile:

```css
overflow-x: auto;
-webkit-overflow-scrolling: touch;
```

Table minimum width:

| Route / Pattern | Mobile Min Width |
| --- | --- |
| `/dashboard/settings/permissions` | `800px` |
| `/dashboard/settings/users` | `850px` |
| `/dashboard/settings/logs` | `800px` |
| `/dashboard/settings/substitutes` | `700px` |
| `/dashboard/settings/no-series` | `650px` |
| `/dashboard/settings/holidays` | `620px` |
| `/dashboard/settings/approvals` | `600px` |

Table header:

- background `#f8fafc`
- text `#64748b`
- font size `12px`
- font weight `700`
- uppercase เฉพาะ column label ที่เป็น technical/admin label

Table row:

- border-bottom `1px solid #f1f5f9`
- hover background `#f8fafc`
- edited/changed row ใช้ highlight `#f0f9ff`

### 6.3 Forms

- input/select height อย่างน้อย `42px`
- border `1px solid #e2e8f0`
- radius `10px - 12px`
- focus ใช้ blue ring หรือ border `#3b82f6`
- mobile ต้อง stack เป็น 1 column และปุ่ม submit ต้องเต็มความกว้างเมื่อพื้นที่ไม่พอ

### 6.4 Buttons

- primary: blue `#2563eb` หรือ gradient `#1d4ed8 -> #3b82f6`
- secondary: white background, border `#e2e8f0`
- danger: red soft background สำหรับ destructive action
- icon-only button ต้องมีขนาดอย่างน้อย `34px x 34px` และมี `title` หรือ tooltip
- touch target บน mobile ควรใกล้ `44px x 44px`

### 6.5 Status Colors

Permission status ต้องใช้สีเดียวกับหน้า Permissions:

| Status | Background | Border | Text |
| --- | --- | --- | --- |
| `RW` | `#eff6ff` | `#bfdbfe` | `#1d4ed8` |
| `RO` | `#fffbeb` | `#fef3c7` | `#d97706` |
| `NONE` | `#ffffff` | `#e2e8f0` | `#94a3b8` |

Alert feedback:

| Type | Background | Border | Text |
| --- | --- | --- | --- |
| success | `#f0fdf4` | `#bbf7d0` | `#166534` |
| info | `#eff6ff` | `#bfdbfe` | `#1e40af` |
| error | `#fef2f2` | `#fecaca` | `#991b1b` |

---

## 7. Layout Pattern ตามชนิดเมนู

### 7.1 Permission Matrix

ใช้กับ:

- `/dashboard/settings/permissions`

โครงสร้าง:

- header + action dock
- status alert
- matrix table card
- legend/help card

Responsive:

- desktop แสดงเต็ม `1200px`
- tablet ยังเป็น matrix พร้อม horizontal scroll
- smartphone stack header/actions และ table scroll แนวนอน ห้ามบีบ column จนอ่านไม่ได้

### 7.2 Master Data CRUD

ใช้กับ:

- `/dashboard/settings/incident-master-data`
- `/dashboard/settings/checklist-master-data`
- `/dashboard/settings/holidays`
- `/dashboard/settings/no-series`

โครงสร้าง:

- header + guide button
- toolbar/search/filter
- create/edit form card
- data table

Responsive:

- desktop ใช้ grid หรือ inline form ได้
- tablet ลด grid เป็น 2 column หรือ 1 column
- smartphone form stack 1 column, action button full width, table horizontal scroll

### 7.3 Focused Setup Form

ใช้กับ:

- `/dashboard/settings/working-hours`

โครงสร้าง:

- centered container `800px - 900px`
- settings card เดียว
- day/time controls แยกเป็น section

Responsive:

- tablet ใช้ 2 column เฉพาะเมื่อ label ยังอ่านง่าย
- smartphone เปลี่ยนเป็น 1 column และไม่ให้ time input เบียดกัน

### 7.4 Workflow Builder

ใช้กับ:

- `/dashboard/settings/workflow`
- `/dashboard/settings/approvals`

โครงสร้าง:

- desktop ใช้ 2-pane: list/config panel + detail/editor panel
- actions ต้องอยู่ใกล้ context ที่แก้ไข
- table หรือ step list ต้องแยกจาก editor ชัดเจน

Responsive:

- tablet collapse จาก 2-pane เป็น stacked sections
- smartphone list และ detail ต้องแสดงทีละ block หลีกเลี่ยง side-by-side

### 7.5 User & Substitute Management

ใช้กับ:

- `/dashboard/settings/users`
- `/dashboard/settings/substitutes`

โครงสร้าง:

- admin table
- modal หรือ inline panel สำหรับ add/edit
- badge/status สำหรับ role และ active state

Responsive:

- table scroll แนวนอน
- modal บน smartphone ต้องไม่เกิน viewport และมี padding เหมาะสม
- action buttons ใน row ต้องไม่ทำให้ column กระโดดหรือทับข้อความ

### 7.6 Audit / Logs Explorer

ใช้กับ:

- `/dashboard/settings/logs`

โครงสร้าง:

- header + export/print action
- filters/search
- log table

Responsive:

- filters stack บน mobile
- table min-width `800px`
- timestamp, actor, action, entity ต้องยัง scan ได้ชัด

---

## 8. Guide Button Standard

ทุกหน้า Settings ต้องมีปุ่มคู่มือข้าง title หรือใน header actions:

- ขนาด `34px x 34px`
- background `#eff6ff`
- radius `10px`
- icon/text ใช้ `📖` ได้ตามมาตรฐานเดิมของระบบ
- content key ใน `system_settings`: `[page]_guide_content`
- edit mode ต้องแสดงเฉพาะ admin

หมายเหตุจาก audit: หน้า `/dashboard/settings/permissions` เป็น reference layout ที่ดี แต่ยังไม่พบ guide button ในโค้ดปัจจุบัน จึงควรเพิ่มในการ implement รอบถัดไปเพื่อให้ครบมาตรฐานเดียวกับหน้า Settings อื่น

---

## 9. Tablet และ Smartphone Requirements

### Tablet

- หลีกเลี่ยง layout ที่มี 3 column ขึ้นไป
- form grid ควรเหลือ 2 column หรือ 1 column
- workflow/editor ต้อง stack หาก panel กว้างต่ำกว่า 300px
- action dock อยู่บน header ได้ แต่ต้องไม่เบียด title/subtitle

### Smartphone

- page padding `12px - 16px`
- header เป็น column
- title ไม่เกิน `22px`
- action dock และ primary button เต็มความกว้างเมื่อพื้นที่ไม่พอ
- table ใช้ horizontal scroll แทนการบีบ column
- ห้ามใช้ font scaling ตาม viewport width
- ห้ามให้ text ทับกันหรือหลุดออกจากปุ่ม/card
- controls ที่กดได้ต้องมีขนาดเหมาะกับนิ้ว

---

## 10. Implementation Checklist

ก่อนสร้างหรือแก้หน้า Settings ต้องตรวจครบรายการนี้:

- [ ] route เป็น standalone ไม่พึ่ง `/dashboard/settings/master-data?type=...`
- [ ] sidebar group ถูกต้องตาม Information Architecture
- [ ] header มี title, subtitle, icon/guide ตามมาตรฐาน
- [ ] action placement ไม่เปลี่ยนตำแหน่งแบบคาดเดายาก
- [ ] desktop/tablet/mobile ไม่มี text overlap
- [ ] table มี horizontal scroll wrapper และ min-width ที่เหมาะสม
- [ ] form stack บน mobile
- [ ] button/icon touch target เหมาะสม
- [ ] feedback state แสดง success/info/error ชัดเจน
- [ ] ไม่มี UI hacks เพื่อแปลงสถานะหรือข้อมูลให้ดูถูกต้องเฉพาะหน้า
- [ ] หากเพิ่ม standard หรือ logic ใหม่ ต้อง sync docs และ changelog

---

## 11. Known Gap จาก Audit รอบนี้

1. `/dashboard/settings/permissions` ยังไม่มี guide button ตามมาตรฐาน Settings เดิม แม้ layout โดยรวมเหมาะเป็น reference
2. บางหน้า Settings ใช้ค่าความกว้างและ responsive min-width ไม่เท่ากันโดยยังไม่มีเอกสารกลางรองรับ เอกสารนี้จึงกำหนดเป็น baseline กลาง
3. Permission page มี `letterSpacing: '-0.5px'` ใน title; มาตรฐานใหม่กำหนดให้ใช้ `letter-spacing: 0` เพื่อให้สอดคล้องกับมาตรฐาน UI ปัจจุบัน

---

## 12. Relationship กับเอกสารมาตรฐานอื่น

- ใช้ร่วมกับ `docs/standards/UI_UX_SETTING.md` สำหรับรายละเอียดหน้า Master Data และ route separation
- ใช้ร่วมกับ `docs/standards/UI_UX_RESPONSIVE.md` สำหรับกฎ multi-device ทั่วทั้งระบบ
- ใช้ร่วมกับ `docs/standards/PERMISSIONS.md` สำหรับ logic สิทธิ์ `RW`, `RO`, `NONE`
- ใช้ร่วมกับ `docs/standards/ZERO_HACK_POLICY.md` เมื่อพบข้อมูลหรือสถานะที่ไม่ตรงมาตรฐาน
