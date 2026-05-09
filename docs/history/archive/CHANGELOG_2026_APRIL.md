# Changelog Archive - April 2026

บันทึกการเปลี่ยนแปลงของระบบในช่วงเดือนเมษายน 2026 และก่อนหน้า

---

### [2026-04-30] - Vercel Production Stability & Action Restructuring
- **Login Reliability Fix (Vercel):** แก้ไขปัญหา Login ไม่ได้บน Vercel Production โดยการเปลี่ยนจากการใช้ Server Action มาเป็น **API-based Auth (`/api/auth/check-tier`)** เพื่อความเสถียรสูงสุด
- **Action Restructuring:** แยกไฟล์ Server Action ออกเป็นส่วนๆ เพื่อลดปัญหา Dependency Conflict บน Serverless Environment:
  - `status.js`: ตรวจสอบประเภทผู้ใช้ (Native Fetch)
  - `login.js`: จัดการการเข้าสู่ระบบ (Isolated Bcrypt)
  - `user.js`: จัดการ Session และข้อมูล Profile
- **Infrastructure Security:** เพิ่มหน้า **System Diagnostic (`/debug-env`)** สำหรับตรวจสอบสถานะ Environment Variables บน Vercel โดยไม่เปิดเผยค่าความลับ
- **Auth Hardening:** เพิ่มระบบดักจับ Error และตรวจสอบตัวแปรสภาพแวดล้อมก่อนเริ่มทำงาน เพื่อป้องกันปัญหา Error 500
- **Test User Sync:** กู้คืนและซิงค์บัญชี `Antigravity` (exam@123.com) ให้สามารถใช้งานบนระบบจริงได้สำหรับการทดสอบ
- **Backup Functionality Fix:** แก้ไข Bug ฟังก์ชัน Backup Log ที่บันทึก/ลบข้อมูลไม่ได้ และแก้ไขปัญหา Timezone ที่ซ่อนข้อมูลวันสุดท้ายของเดือน
- **UI Auto-Refresh:** เพิ่มระบบ Auto-refresh (ทุก 5 นาที) ในหน้า Dashboard และ Backup Log เพื่อให้ข้อมูลอัปเดตตลอดเวลาโดยไม่ต้องรีเฟรชหน้าจอเอง
- **Numeric Date Formatting:** เพิ่มฟังก์ชัน `formatDateNumeric` เพื่อแสดงผลวันที่ในรูปแบบ `dd/mm/yyyy` และนำไปใช้ในหน้า SLA Compliance Dashboard ทั้งส่วนฟิลเตอร์และตารางรายการ

### [2026-05-01] - Security Hardening, Standardization & Audit Readiness
- **Core Development Standards:** จัดทำไฟล์ `DEVELOPMENT_STANDARDS.md` เพื่อเป็น "หัวใจหลัก" ในการควบคุมมาตรฐานความปลอดภัย, การเก็บ Log และคุณภาพโค้ดระดับ Enterprise
- **Double-Lock Identity Whitelist:** นำระบบ **"ทะเบียนขาวลับ" (`user_whitelist`)** มาใช้เพื่อเป็นด่านตรวจที่สอง ป้องกันปัญหาการสร้างโปรไฟล์อัตโนมัติจาก Database Triggers
- **Identity Hashing (SHA-256):** เข้ารหัสอีเมลในทะเบียนขาวเป็น SHA-256 Hash เพื่อความปลอดภัยสูงสุด (Privacy-by-Design)
- **Proactive Auto-Purge:** พัฒนาระบบกวาดล้างผู้บุกรุกในหน้า **Auth Callback** ที่จะสั่งลบ User ออกจาก Supabase Auth ทันทีหากไม่มีตราประทับใน Whitelist
- **SSO Login Logging (Audit Trail):** เพิ่มระบบจดบันทึกประวัติการเข้าใช้งานสำหรับผู้ที่ Login ผ่าน Microsoft SSO เพื่อให้มี Audit Trail ที่สมบูรณ์ในหน้า Profile และ User Management
- **Database Role Normalization:** จัดระเบียบข้อมูลสิทธิ์ (Role) ใน Database ทั้งระบบให้เป็นมาตรฐานเดียวกัน (`administrator`, `supervisor`, `approval`, `guest`) พร้อมอัปเกรด DB Check Constraint
- **Profile Data Repair:** ซ่อมแซมข้อมูลอีเมลที่หายไปในตาราง `user_profiles` ของผู้ใช้เดิมเพื่อให้หน้าจัดการผู้ใช้แสดงผลสมบูรณ์ 100%
- **Solid Iconography Standard:** เปลี่ยนไอคอนแสดงรหัสผ่านทั้งหมดเป็นแบบ **Solid SVG Icons** ที่เป็นทางการระดับ Enterprise ทั้งในหน้า Login, สร้าง User และหน้า Profile
- **Bot Protection Reinforcement:** เสริมเกราะป้องกันบอทในหน้า Login ด้วยระบบ **Honeypot** และ **Cloudflare-style human verification** เพื่อป้องกันการโจมตีแบบ Brute-force
- **Password UX Overhaul:** มาตรฐานการซ่อน/แสดงรหัสผ่านแบบ Unified ที่มี visual feedback และ security checklists ครบถ้วนในทุกจุดป้อนข้อมูล
- **Dual-Record Creation Standard:** บังคับใช้มาตรฐานการสร้าง User แบบ 3 ส่วน (Auth -> Whitelist -> Profile) เพื่อความถูกต้องของข้อมูลและระบบ Double-Lock Security
- **Enhanced Admin Feedback:** ปรับปรุงระบบรายงาน Error ในการสร้าง User ให้ระบุจุดที่ล้มเหลวอย่างชัดเจน (Auth Error, Whitelist Error, Profile Error)

### [2026-05-03] - UI Refinement & Next-Gen Checklist Planning
- **DatePicker UX Improvement:** แก้ไขปัญหาการคลิก Datepicker ยากสำเร็จ 100% ในหน้า Master Data, SLA Report, Backup Log, No. Series และ Checklist โดยใช้ `showPicker()` API
- **Standardized Date Display:** ปรับรูปแบบการแสดงผลวันที่ทั่วทั้งระบบให้เป็น `dd-MMM-yyyy` (เช่น 30-Apr-2026) เพื่อความเป็นระเบียบและอ่านง่าย
- **Dynamic Checklist Architecture (Planned):** ออกแบบสถาปัตยกรรมใหม่สำหรับระบบ Checklist ให้รองรับการเลือกแผนซ้อม IT (Drill Plans) และการตรวจตู้ CCTV แบบระบุรายการตู้ โดยใช้โครงสร้างข้อมูล JSONB
- **OneDrive Integration Strategy (Planned):** วางแผนการเชื่อมต่อ Microsoft Graph API เพื่อเก็บรูปภาพหลักฐานไว้ใน OneDrive Shared Folder เพื่อประหยัดพื้นที่ Supabase
- **Image Compression System (Planned):** เตรียมระบบบีบอัดรูปภาพฝั่ง Client ให้มีขนาดไฟล์ไม่เกิน 150kb ก่อนอัปโหลด เพื่อประสิทธิภาพสูงสุดในการใช้งาน

### [2026-05-04] - UI Optimizations, Account Management Hardening & Workflow Planning
- **Persistent Sidebar Settings:** แก้ไข Logic การแสดงผลเมนูตั้งค่าใน Sidebar ให้ค้างอยู่ (Persistent) เมื่อมีการเปลี่ยนวันที่ปฏิบัติงานหรือกด Refresh เพื่อความต่อเนื่องในการใช้งาน
- **Dashboard Dynamic Card Styling:** ปรับปรุงการ์ด Checklist บน Dashboard (Weekly, Monthly, Yearly) ให้มีการแสดงผลสีเขียวและขอบเน้นเมื่อสถานะเป็น `done` เพื่อให้สอดคล้องกับมาตรฐานของ Daily Checklist
- **Account Management (Assignee Restore):** 
  *   กู้คืนฟิลด์ **Assignee (can_be_assignee)** กลับมาในหน้าสร้างและแก้ไข User
  *   เพิ่มระบบ **Quick Action Toggle** ในตารางจัดการผู้ใช้ เพื่อให้ Admin สามารถสลับสถานะผู้รับมอบหมายงานได้โดยตรงจากหน้าลิสต์ (Optimistic UI Update)
  *   เพิ่มตัวบ่งชี้ไอคอน 👤 ในตารางหลักสำหรับผู้ที่มีสิทธิ์เป็น Assignee
- **Compact Settings Sidebar:** ปรับลดขนาดตัวอักษร (14px -> 13px) และระยะห่างแนวตั้ง (12px -> 10px) ของเมนูในหน้า Master Data/Settings เพื่อให้ดู Sleek และกะทัดรัดขึ้น
- **Approval Workflow Blueprint:** จัดทำ **Implementation Plan** สำหรับระบบอนุมัติงาน (Approval Workflow) และระบบผู้ช่วยอนุมัติแทน (Substitute Approver) เพื่อเตรียมความพร้อมสำหรับฟีเจอร์ Enterprise ในขั้นตอนถัดไป

---
*ย้ายข้อมูลเมื่อ 08-May-2026 เพื่อลดขนาดไฟล์หลัก*
