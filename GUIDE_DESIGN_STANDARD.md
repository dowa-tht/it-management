# 🤖 Standard for Admin-Editable UI Guides

มาตรฐานการออกแบบหน้าจอช่วยเหลือ (Help/Guide) สำหรับ Dowa IT System เพื่อให้มีความสวยงามสอดคล้องกันและง่ายต่อการจัดการโดย Administrator

---

## 💎 Design Principles (หลักการออกแบบ)

1. **Wow First Impression:** เมื่อเปิด Guide ขึ้นมา ผู้ใช้ต้องรู้สึกว่าระบบมีความเป็นมืออาชีพ (Premium Look)
2. **Visual Hierarchy:** ใช้สีและขนาดตัวอักษรเพื่อแยกส่วนความสำคัญ (เช่น T1 สีน้ำเงิน, T2 สีเขียว)
3. **Structured Information:** แบ่งข้อมูลเป็น Card หรือ Section ไม่ควรเป็นตัวอักษรเรียงกันยาวๆ
4. **Interactive Editor:** ส่วนการแก้ไขของ Admin ต้องมี UI ที่แยกชัดเจนจากส่วนแสดงผล และใช้งานง่าย

---

## 🛠️ Technical Specification

### 1. Data Storage (การจัดเก็บข้อมูล)
- เก็บข้อมูลในตาราง `system_settings`
- **Key Convention:** `[page_name]_guide_content` (เช่น `master_data_guide_content`)
- **Format:** ใช้ JSON หรือ Markdown (แนะนำ Markdown เพื่อความยืดหยุ่น)

### 2. UI Components (องค์ประกอบของ UI)
- **Modal Size:** ควรเป็น `maxWidth: 800px` และ `maxHeight: 90vh`
- **Header:** ใช้ Background Gradient (เช่น `linear-gradient(135deg, #1e40af, #3b82f6)`)
- **Content:** ใช้ `white-space: pre-wrap` เพื่อรักษาการจัดบรรทัด หรือใช้ Markdown Renderer
- **Animation:** ใส่ Fade-in หรือ Slide-up เล็กน้อยเมื่อเปิด Modal

---

## 🎨 Color Coding for Templates
เพื่อความเป็นเอกภาพ ให้ใช้สีดังนี้สำหรับ Checklist Templates:
- **T1 Photo:** Blue (`#3b82f6`) - สื่อถึงความน่าเชื่อถือ
- **T2 Procedure:** Emerald (`#10b981`) - สื่อถึงความถูกต้องตามขั้นตอน
- **T3 Measure:** Amber (`#f59e0b`) - สื่อถึงการเฝ้าระวัง
- **T4 Link:** Indigo (`#6366f1`) - สื่อถึงโลกภายนอก/เครือข่าย
- **T5 Sign-off:** Rose (`#f43f5e`) - สื่อถึงความรับผิดชอบและการลงนาม

---

## 🔐 Security & RBAC
- **Viewer:** ทุกคนในระบบสามารถอ่าน Guide ได้
- **Editor:** เฉพาะผู้ที่มี Role `administrator` เท่านั้นที่จะเห็นปุ่มแก้ไข
- **Validation:** ควรมีการยืนยัน (Confirmation) ก่อนการบันทึกทับข้อมูลเดิม

---

*สร้างโดย: Antigravity AI | วันที่: 2026-05-04*
