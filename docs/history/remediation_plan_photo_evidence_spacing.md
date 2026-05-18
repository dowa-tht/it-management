# 📋 แผนการปรับปรุง Spacing ของ Template Photo Evidence

## 1. วัตถุประสงค์
แก้ไขปัญหาเลย์เอาต์หน้าจอในส่วน **Template behavior -> T1: Photo Evidence** ของผู้สร้างเทมเพลต Checklist ที่มีจุดตรวจและข้อมูลการตั้งค่ารูปภาพชิดติดกันเกินไป (Layout Spacing Defect) โดยการเปลี่ยนจาก Tailwind utility classes ที่ไม่เสถียรมาเป็น Class แบบ **CSS Explicit** ตามมาตรฐาน [UI Layout Spacing Remediation Standard](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_LAYOUT_SPACING_REMEDIATION.md)

---

## 2. การวิเคราะห์ปัญหา (Root Cause Analysis)
จากการตรวจสอบพฤติกรรมในหน้าจอสร้างเทมเพลต:
- คอนเทนเนอร์รายการจุดตรวจตรวจเช็คใช้ Tailwind class เช่น `space-y-3` และ `space-y-5` ซึ่งไม่เสถียรหรือถูกยกเลิกการแสดงผล/ทับซ้อนในสภาพแวดล้อมปัจจุบัน ส่งผลให้แต่ละแถวจุดตรวจ (Point Rows) ไม่มีระยะห่างแนวตั้ง (Margin) เลย และชิดติดกันเป็นกล่องเดียว
- การแยกสัดส่วนระหว่างรายการจุดตรวจกับฟิลด์ "จำนวนภาพขั้นต่ำ MIN" ด้านล่างก็ชิดกันจนไม่แยกกลุ่มข้อมูลที่ชัดเจน

---

## 3. แผนการแก้ไขเชิงโครงสร้าง (Technical Implementation Plan)
เราจะสร้างคลาส CSS เฉพาะแบบ Explicit ลงใน `<style>` บล็อกของ `TemplateForm.js` เพื่อควบคุมและรับประกันระยะห่างและสเปซแนวตั้ง ดังนี้:

### 3.1 การเพิ่มสไตล์ CSS ใน `<style>` (ของไฟล์ TemplateForm.js)
```css
.photo-evidence-stack {
  display: grid;
  gap: 20px;
}
.photo-points-list {
  display: grid;
  gap: 12px;
}
.photo-point-row {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
.photo-config-card {
  display: grid;
  gap: 16px;
  background: #ffffff;
  padding: 20px;
  border-radius: 18px;
  border: 1px solid #f1f5f9;
}
@media (min-width: 768px) {
  .photo-config-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

### 3.2 ปรับเปลี่ยนองค์ประกอบ HTML ในโค้ด
- เปลี่ยน `<div className="space-y-5">` เป็น `<div className="photo-evidence-stack">`
- เปลี่ยน `<div className="space-y-3">` เป็น `<div className="photo-points-list">`
- เปลี่ยนแถวจุดตรวจจาก `<div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">` เป็น `<div key={idx} className="photo-point-row">`
- ปรับปรุง `<div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-2xl border border-slate-100">` เป็น `<div className="photo-config-card">`

---

## 4. แผนการทดสอบและทวนสอบความถูกต้อง (Verification Plan)
1. ตรวจสอบความถูกต้องของการแก้ไขในระดับโค้ด เพื่อมั่นใจว่าไม่มี Syntax Error และการครอบแท็กถูกต้อง
2. รันคำสั่ง `npm run lint` เพื่อตรวจสอบไวยากรณ์และความสอดคล้อง
3. รันการทดสอบระบบผ่าน `npm test` เพื่อให้มั่นใจว่าผลการรันเคสทดสอบเดิมยังคงผ่าน 100%
4. ทำการบันทึกสรุปลงใน Changelog ของโครงการตามขั้นตอนของระบบ
