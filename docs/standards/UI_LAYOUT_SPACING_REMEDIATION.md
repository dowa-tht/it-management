# UI Layout Spacing Remediation Standard

**Status:** Active Standard  
**Scope:** ทุกหน้า UI ที่พบปัญหา text/card/object ชิดขอบ, card ติดกัน, section ไม่มีระยะห่าง, หรือ Tailwind utility ไม่สร้าง spacing ตามที่คาด  
**Primary Area:** `/dashboard/settings/*`, Checklist Template Builder, Procedure Plan Editor, Modal/Form layouts  
**Last Updated:** 2026-05-15 04:55 +07:00

---

## 1. วัตถุประสงค์

เอกสารนี้กำหนดมาตรฐานการตรวจและแก้ไขปัญหา layout ที่เกิดจาก spacing ไม่ถูกต้อง เช่น card ชิดกัน, object ติด border, section ซ้อนกัน, หรือ padding/gap หาย โดยเฉพาะกรณีที่ Tailwind utility class ไม่ทำงานตามที่คาดในบาง component

เป้าหมายคือให้ Agent แก้ที่ root cause ของ layout ไม่แก้แบบเดา ไม่เพิ่ม margin เฉพาะจุดแบบสุ่ม และไม่ใช้ UI hack ที่ทำให้หน้าดูเหมือนถูกต้องเฉพาะ screenshot เดียว

---

## 2. อาการที่ต้องถือว่าเป็น Layout Defect

หากพบอาการต่อไปนี้ ต้องถือว่าเป็น defect และต้องตรวจตามมาตรฐานนี้ก่อนสรุปว่างานเสร็จ:

- Text หรือ badge ชิด border ของ card/input/preview มากเกินไป
- Section title อยู่ติดขอบ outer card โดยไม่มี padding ชัดเจน
- Card หลายใบติดกันจนไม่มี visual separation
- Card ซ้อน card หลายชั้นโดยไม่มีเหตุผลเชิง UX
- Grid item มี gap ไม่เท่ากันหรือบาง breakpoint gap หาย
- Form section เช่น `General`, `Type`, `Preview`, `Snapshot` ติดกันโดยไม่มีระยะห่าง
- Preview/Execution/Snapshot list ใช้ row/card ที่ดูเหมือน input แต่ไม่มี padding ภายใน
- Header สวยแล้วแต่ body ยังชิดขอบหรือ layout แตก
- Refresh แล้ว UI ไม่เปลี่ยน แม้แก้ className ไปแล้ว

---

## 3. Root Cause ที่พบบ่อย

### 3.1 Tailwind Utility ไม่ถูก Apply หรือถูก Purge/Merge ผิดบริบท

สัญญาณ:

- ใช้ `p-6`, `p-7`, `space-y-6`, `gap-4`, `mb-4` แล้วภาพจริงยังเหมือนไม่มี spacing
- เปลี่ยน utility class แล้ว refresh ไม่เห็นผล
- Component อื่นที่ใช้ CSS explicit กลับแสดงผลถูกต้อง

แนวทางแก้:

- เปลี่ยน wrapper สำคัญเป็น CSS class explicit
- กำหนด `display`, `gap`, `padding`, `border`, `border-radius`, `background`, `box-shadow` ใน `<style>` หรือ stylesheet ที่ component ใช้งานจริง
- ห้ามแก้ด้วยการเพิ่ม utility ซ้อนหลายตัว เช่น `p-6 px-8 py-10 mt-4 mb-8` โดยไม่รู้ว่าตัวไหนทำงาน

ตัวอย่างที่ถูกต้อง:

```css
.template-form-stack {
  display: grid;
  gap: 28px;
}

.template-form-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  padding: 28px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}
```

ตัวอย่างที่ไม่ควรใช้เมื่อเจอ bug ซ้ำ:

```jsx
<div className="space-y-6">
<section className="rounded-[24px] border border-slate-200 bg-white/90 p-7 shadow-sm">
```

### 3.2 ใช้ Margin Collapse หรือ `space-y-*` กับ Card Stack สำคัญ

สัญญาณ:

- Card แรกกับ card ถัดไปติดกัน
- ระยะห่างหายเฉพาะบาง section
- มี border/card แปลก ๆ อยู่ตรงกลางระหว่าง section

แนวทางแก้:

- ใช้ parent stack แบบ `display: grid; gap: ...`
- กำหนด class เช่น `.page-section-stack`, `.template-form-stack`, `.editor-preview-stack`
- หลีกเลี่ยงการให้ child card คุม margin เอง หาก card เป็น sibling หลายตัว

### 3.3 Padding อยู่ผิดชั้นของ DOM

สัญญาณ:

- Outer card มี border แต่ heading ชิดขอบ
- Inner grid มี padding แต่ title อยู่นอก padding
- มีกรอบซ้อน 2 ชั้นแล้ว text ยังชิดขอบ

แนวทางแก้:

- เลือกให้ชัดว่า padding อยู่ที่ outer card หรือ inner frame
- หาก heading และ content เป็น section เดียวกัน ต้องอยู่ใต้ frame ที่คุม padding เดียวกัน
- ห้ามสร้าง inner shell เพิ่มเพื่อแก้ขอบ หากปัญหาคือ outer card ไม่มี padding

Pattern ที่แนะนำ:

```jsx
<section className="layout-card">
  <div className="section-stack">
    <SectionTitle />
    <div className="config-box">
      <div className="item-grid">...</div>
    </div>
  </div>
</section>
```

### 3.4 Card ซ้อน Card โดยไม่มีโครงสร้างชัดเจน

สัญญาณ:

- ภาพดูเหมือนมีกล่อง 2 ชั้นโดยไม่รู้ว่าชั้นไหนคือ section จริง
- Shadow/border หลายเส้นชนกัน
- Snapshot/Preview ดูหนักกว่า Form หลัก

แนวทางแก้:

- ใช้ outer card เพียงชั้นเดียวสำหรับ section
- ใช้ inner `config-box` เฉพาะเมื่อเป็น grouped controls หรือ grouped preview rows
- ใช้ repeated item card สำหรับ row/item เท่านั้น
- ถ้าต้องมี 3 ชั้น ต้องมีเหตุผลชัดเจน เช่น modal > section > repeated row

### 3.5 Grid/Flex ไม่มี Gap หรือ Gap อยู่ผิด breakpoint

สัญญาณ:

- Desktop ดูดี แต่ mobile card ติดกัน
- Grid 3 columns แน่นเกินไป
- Action button เบียด text

แนวทางแก้:

- กำหนด `gap` ที่ parent grid/flex เสมอ
- ระบุ breakpoint ด้วย CSS explicit เมื่อ utility ไม่เสถียร
- ไม่ใช้ 3 columns หากพื้นที่ content แต่ละ column ต่ำกว่า 280px

```css
.snapshot-grid {
  display: grid;
  gap: 14px;
}

@media (min-width: 1024px) {
  .snapshot-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

### 3.6 Form Control ไม่มี Internal Padding

สัญญาณ:

- Text ใน input/select/textarea ชิดซ้ายหรือชิดบน
- Label ติด input เกินไป
- Checkbox/toggle row ดูเหมือนไม่มี breathing room

แนวทางแก้:

- Input/select height อย่างน้อย `42px - 46px`
- Input/select padding `0 14px` หรือ `12px 16px`
- Textarea padding `14px - 16px`
- Toggle row padding `14px 16px`, gap `10px - 12px`
- Label กับ control ควรมี `margin-top: 8px - 10px`

---

## 4. Standard Remediation Workflow

เมื่อ USER ส่ง screenshot หรือแจ้งว่า layout ชิดขอบ/card ติดกัน ให้ทำตามลำดับนี้:

1. วิเคราะห์ภาพจริงก่อนตอบว่าแก้แล้ว
2. ระบุ section ที่มีปัญหาเป็นชื่อ component/DOM เช่น `TemplateForm > General/Type`, `TemplatePreview`, `Standards Snapshot`
3. อ่านไฟล์ component จริงก่อนแก้
4. หา parent container ที่ควบคุม spacing ไม่ใช่แก้เฉพาะ child ตัวเดียว
5. ตรวจว่าพึ่ง Tailwind utility ที่อาจไม่ถูก apply หรือไม่ เช่น `p-*`, `space-y-*`, `gap-*`, `mb-*`
6. ถ้า utility ไม่ทำงานหลัง refresh ให้เปลี่ยนเป็น CSS explicit class
7. ใช้ pattern เดียวกันทั้ง section ไม่แก้ทีละกล่องแบบคนละดีไซน์
8. ตรวจทุก section sibling ในหน้าเดียวกัน เช่น General, Type, Preview, Snapshot, Execution Preview
9. Run lint เฉพาะไฟล์ที่แก้เป็นอย่างน้อย
10. อ่านไฟล์หลังแก้เพื่อยืนยันว่าบันทึกสำเร็จ
11. อัปเดต changelog/task tracker หากเป็นงาน UI สำคัญ

---

## 5. Required CSS Patterns

### 5.1 Section Stack

ใช้สำหรับ wrapper ที่มีหลาย card หรือหลาย section ต่อกัน:

```css
.section-stack {
  display: grid;
  gap: 28px;
}

@media (max-width: 768px) {
  .section-stack {
    gap: 22px;
  }
}
```

ห้ามใช้ `space-y-*` เป็นตัวหลักในหน้า/section ที่เคยพบว่า spacing หาย

### 5.2 Primary Card

ใช้สำหรับ section หลัก:

```css
.primary-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  padding: 28px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

@media (max-width: 768px) {
  .primary-card {
    padding: 22px 18px;
  }
}
```

### 5.3 Config Box

ใช้สำหรับกลุ่ม controls หรือ preview rows ภายใน card:

```css
.config-box {
  margin-top: 20px;
  border-radius: 22px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.9);
  padding: 20px;
}
```

### 5.4 Inner Item Card

ใช้สำหรับ row/card ย่อย:

```css
.inner-item-card {
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 14px 16px;
  line-height: 1.6;
}
```

---

## 6. Minimum Spacing Values

| Element | Minimum Desktop | Minimum Mobile | Notes |
| --- | --- | --- | --- |
| Page section stack | `28px` | `22px` | ระหว่าง card หลัก |
| Card padding | `28px` | `18px - 22px` | ห้ามต่ำกว่า 18px บน mobile |
| Config box padding | `20px` | `16px` | กลุ่ม controls/preview |
| Inner item padding | `14px 16px` | `14px 14px` | row/card ย่อย |
| Grid gap | `12px - 16px` | `12px` | ขึ้นกับ density |
| Label to input | `8px - 10px` | `8px` | ใช้ margin/top spacing |
| Section title to content | `16px - 20px` | `14px - 16px` | หัวข้อกับ body |
| Card radius | `20px - 24px` | `18px - 24px` | ห้าม radius ใหญ่จนชนกัน |

---

## 7. Checklist ก่อนส่งมอบ UI Spacing Fix

- [ ] Screenshot issue ถูกวิเคราะห์จากภาพจริงแล้ว
- [ ] อ่าน component จริงก่อนแก้
- [ ] แก้ parent spacing ไม่ใช่เฉพาะ child ที่เห็นในภาพ
- [ ] Section หลักใช้ explicit card class เมื่อ Tailwind utility เคยไม่เสถียร
- [ ] Card stack ใช้ `display: grid; gap` ไม่พึ่ง `space-y-*`
- [ ] Heading และ content อยู่ใน padding layer เดียวกัน
- [ ] ไม่มี card ซ้อนโดยไม่มีเหตุผล
- [ ] Controls มี internal padding และ label spacing
- [ ] Desktop/mobile มี gap และ padding แยกชัดเจน
- [ ] ตรวจ sibling sections ทั้งหน้า ไม่ปล่อยให้ USER ต้องชี้ทีละจุด
- [ ] Run lint หรือ validation ที่เหมาะสมแล้ว
- [ ] อ่านไฟล์หลังแก้เพื่อยืนยันผล
- [ ] อัปเดตเอกสารและ changelog หากเป็น standard หรือ pattern ใหม่

---

## 8. Relationship กับเอกสารอื่น

- ใช้ร่วมกับ `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md` สำหรับ design language ของ Settings
- ใช้ร่วมกับ `docs/standards/UI_UX_SETTING.md` สำหรับ Master Data layout
- ใช้ร่วมกับ `docs/standards/UI_UX_RESPONSIVE.md` สำหรับ breakpoint และ multi-device behavior
- ใช้ร่วมกับ `docs/standards/ZERO_HACK_POLICY.md` เพื่อยืนยันว่า layout fix ต้องแก้ root cause ไม่ใช่ทำให้ดูถูกเฉพาะหน้า

