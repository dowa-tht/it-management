# 📱 Standard: Multi-Device Responsive Design (UI/UX)

มาตรฐานการออกแบบหน้าจอเพื่อให้รองรับการใช้งานได้ทุกอุปกรณ์ (Desktop, Tablet, Smartphone) ของ DOWA IT System

## 1. Breakpoints มาตรฐาน
- **Desktop (LG):** 1024px ขึ้นไป
- **Tablet (MD):** 768px ถึง 1023px
- **Mobile (SM):** 767px ลงไป

## 2. กฎเหล็กสำหรับการเขียน CSS
- **No Fixed Widths:** ห้ามใช้ `width` เป็น px กับ Container หลัก ให้ใช้ `width: 100%` หรือ `max-width` แทน
- **Flexible Grids:** ใช้ `grid-template-columns: repeat(auto-fit, minmax(px, 1fr))` เพื่อให้ Card จัดเรียงตัวเองตามขนาดหน้าจออัตโนมัติ
- **Adaptive Padding:** บนมือถือควรลด Padding ลง (เช่น จาก 24px เป็น 12px) เพื่อเพิ่มพื้นที่แสดงผล
- **Overflow Prevention:** ห้ามให้เกิด Horizontal Scroll ในแนวแกน X โดยเด็ดขาด
- **Touch Targets:** ปุ่มกดบนมือถือต้องมีขนาดไม่ต่ำกว่า 44x44px เพื่อให้กดง่าย

## 3. การจัดการตาราง (Tables)
- ตารางที่มีข้อมูลเยอะต้องหุ้มด้วย `<div class="table-scroll">` ที่มี `overflow-x: auto` เสมอ เพื่อให้เลื่อนดูเฉพาะตารางได้โดยไม่ทำให้ทั้งหน้าจอล้น

## 4. Typography
- ใช้หน่วย `rem` หรือ `px` ที่เหมาะสม โดยบนมือถืออาจมีการลดขนาดหัวข้อ (h1, h2) ลง 10-20% เพื่อไม่ให้กินพื้นที่มากเกินไป
