# Changelog Archive - 2026-05-01

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

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
