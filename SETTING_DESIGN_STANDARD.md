# 🎨 Dowa IT System: Setting Design Standards

เอกสารฉบับนี้กำหนดมาตรฐานการออกแบบ (Design Standards) สำหรับเมนูในส่วน **Settings** และ **Master Data** ทั้งหมด เพื่อให้มั่นใจว่าการพัฒนาฟีเจอร์ใหม่ในอนาคตจะมีรูปลักษณ์และประสบการณ์การใช้งาน (UI/UX) ที่เป็นไปในทิศทางเดียวกัน

---

## 1. Layout & Structure
*   **Main Container:** ใช้ `padding: 24px` รอบด้าน พื้นหลังสี `#f8fafc` (Off-white)
*   **Header Section:** 
    *   `h1`: ขนาด `22px`, `font-weight: 800`, สี `#0f172a`
    *   `Sub-caption`: ขนาด `13px`, สี `#64748b`
*   **Sidebar (Navigation):** 
    *   ความกว้างคงที่ `280px`
    *   `Border-radius: 20px`, พื้นหลัง `#ffffff`
    *   สถานะ Active: พื้นหลัง `#eff6ff`, ตัวอักษร `#2563eb`, มีเส้นขอบซ้าย (Border-left) `4px solid #2563eb`

---

## 2. Component Standards

### 📦 Cards & Containers
*   **Background:** `#ffffff` (Pure White)
*   **Border:** `1px solid #e2e8f0`
*   **Border-radius:** `20px` (Rounded Corners)
*   **Shadow:** `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05)`

### 📊 Tables (Data Grid)
*   **Header:** พื้นหลัง `#f8fafc`, เส้นขอบล่าง `2px solid #f1f5f9`
*   **Rows:** เส้นขอบล่าง `1px solid #f1f5f9`, ความสูง `padding: 14px 20px`
*   **Drag Handle (⠿):** ต้องอยู่ **คอลัมน์แรกสุดเสมอ**, สี `#cbd5e1`, cursor: `grab`

### 🔘 Action Buttons (Management)
*   **Shape:** วงกลมหรือสี่เหลี่ยมโค้งมนมน (`borderRadius: 10px`)
*   **Size:** `34px x 34px`
*   **Styles:**
    *   **Edit:** พื้นหลัง `#eff6ff`, ไอคอนสี `#2563eb`
    *   **Delete:** พื้นหลัง `#fef2f2`, ไอคอนสี `#dc2626`
*   **Interaction:** เมื่อ Hover ให้ `translateY(-2px)` และเพิ่ม `box-shadow`

### ⌨️ Form Inputs & Buttons
*   **Input Fields:** `border-radius: 14px`, `border: 1px solid #e2e8f0`, `padding: 12px 16px`
*   **Primary Button:** พื้นหลัง `#2563eb`, `border-radius: 14px`, ตัวอักษรสีขาวหนา, มีเงาจางๆ (Soft Shadow)

---

## 3. Special Features

### 🕘 Time Picker (24H)
*   **Design:** ใช้รูปแบบ "Time Grid Select" แทนการพิมพ์ (00-23 ชั่วโมง / 00-55 นาที)
*   **Aesthetics:** แสดงผลในรูปแบบ Digital Clock พร้อมไอคอน 🕒 และเส้นขอบเน้นสีฟ้าด้านซ้าย

### 📖 Guide Modal
*   **Backdrop:** สี `rgba(15, 23, 42, 0.7)` พร้อมเอฟเฟกต์ `backdrop-filter: blur(4px)`
*   **Header:** ใช้ Gradient พื้นหลังจากสีเข้มไปอ่อน (`#1e3a8a` -> `#3b82f6`)
*   **Content:** รองรับการแสดงผลแบบ Card-based แยกตามประเภท T0-T5 (ใช้สี Border ด้านซ้ายแยกประเภท)

---

## 4. Guide & Documentation Standard

เพื่อให้ระบบมีคู่มือการใช้งานที่ครอบคลุมและเป็นมาตรฐานเดียวกัน ทุกหน้าในส่วน Setting ต้องมีระบบ Guide ดังนี้:

### 4.1 UI Component
*   ต้องมีปุ่มไอคอน 📖 (ขนาด 34x34px) วางต่อจากหัวข้อหน้าจอ (Title)
*   ปุ่มต้องเรียกเปิด Modal ที่มีโครงสร้างตามมาตรฐานในข้อ 3

### 4.2 Content Structure (Markdown-based)
การเขียนเนื้อหาใน Guide ต้องใช้รูปแบบดังนี้เพื่อให้ระบบ Render เป็น Card ที่สวยงาม:
1.  **Main Title:** ใช้ `###` สำหรับหัวข้อใหญ่สุดของหน้า
2.  **Section Divider:** ใช้ `---` เพื่อตัดแบ่งเนื้อหาเป็นส่วนๆ
3.  **Content Card:** ใช้ `####` สำหรับหัวข้อภายใน Card (ระบบจะสร้างกรอบสีขาวและเงาให้อัตโนมัติ)
4.  **Color Coding:** หากตั้งหัวข้อ Card ด้วยคำนำหน้าเฉพาะ ระบบจะแสดงสีเส้นขอบต่างกัน:
    *   `#### Tier 1` หรือ `#### T1`: สีฟ้า (Primary)
    *   `#### Tier 2` หรือ `#### T2`: สีเขียว (Success)
    *   `#### Tier 3` หรือ `#### T3`: สีส้ม (Warning)
    *   `#### Tier 4` หรือ `#### T4`: สีม่วง (Indigo)

### 4.3 Administrator Editing Protocol
*   ระบบ Guide ในทุกหน้าต้องมีโหมดแก้ไข (Editing Mode) สำหรับผู้มีสิทธิ์ `administrator` เท่านั้น
*   **Storage:** เนื้อหาต้องถูกเก็บไว้ในตาราง `system_settings` โดยใช้ Key รูปแบบ `[page_name]_guide_content`
*   **Logic:** เมื่อเปิด Modal ให้ตรวจสอบสิทธิ์ผู้ใช้ หากเป็น Admin ให้แสดงปุ่ม **✏️ Edit** เพื่อสลับไปใช้ `textarea` ในการแก้ไขเนื้อหา

---

## 🚀 Implementation Rule
> **"หากมีการเพิ่มเมนูในส่วน Setting ใหม่ในอนาคต ต้องใช้โครงสร้างและชุดสีตามเอกสารฉบับนี้ 100% เพื่อรักษาความ Premium และความเป็นมืออาชีพของระบบ"**
