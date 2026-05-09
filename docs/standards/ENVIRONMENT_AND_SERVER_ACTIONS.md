# 🛡️ มาตรฐานการจัดการ Environment Variables และ Server Actions

มาตรฐานนี้กำหนดขึ้นเพื่อป้องกันปัญหาการเข้าถึงค่าตัวแปรสภาพแวดล้อม (Environment Variables) ล้มเหลว และเพื่อให้มั่นใจว่า Server-side logic จะถูกทำงานใน Context ที่ถูกต้องเสมอ

## 1. การใช้งาน Server Actions (`'use server'`)
ทุกไฟล์ใน `app/actions/` **ต้องระบุ `'use server'` ที่บรรทัดแรกสุด** ของไฟล์เสมอ
- **เหตุผล**: เพื่อให้ Next.js แยก Bundle สำหรับ Server-side โดยเฉพาะ ทำให้สามารถใช้งานตัวแปรลับ (Private Env Vars) และโมดูลของ Node.js เช่น `fs`, `crypto` ได้
- **ข้อควรระวัง**: หากขาด Directive นี้ ไฟล์จะถูกมองเป็น Client Component และตัวแปรสภาพแวดล้อมที่ไม่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะมีค่าเป็น `undefined`

## 2. การจัดการ Supabase Admin Client
การสร้าง Admin Client (Service Role) ต้องใช้ฟังก์ชันกลางผ่าน Singleton Pattern เพื่อความเสถียร
- **Source of Truth**: ใช้ฟังก์ชัน `getSupabaseAdmin()` จาก `@/lib/supabaseAdmin`
- **การโหลดค่า Env**: 
    - ระบบจะพยายามดึงจาก `process.env` เป็นอันดับแรก
    - หากไม่พบ (เช่นในบางสภาวะของ Turbopack) ระบบจะใช้ `envLoader.js` เพื่ออ่านไฟล์ `.env.local` โดยตรงจาก Disk เป็นระบบสำรอง (Fallback)

## 3. ระบบสำรอง Env Loader (Fallback Mechanism)
ในกรณีที่ `process.env` ทำงานผิดปกติ ให้ใช้โครงสร้างดังนี้:
```javascript
// lib/envLoader.js
// ระบบอ่านไฟล์ตรงเฉพาะฝั่ง Server เพื่อป้องกันแอปพังหาก Env โหลดไม่ทัน
const getEnvValues = () => {
  if (typeof window !== 'undefined') return {} // ข้ามหากเป็นฝั่ง Client
  try {
    const fs = require('fs')
    // ... logic อ่านไฟล์และ parsing ...
  } catch (e) { ... }
}
```

## 4. การตรวจสอบความถูกต้อง (Evidence-Based Verification)
หากพบปัญหา "Missing Credentials" ให้ตรวจสอบตามลำดับดังนี้:
1. เช็คว่าไฟล์ Action มี `'use server'` หรือไม่
2. เช็คชื่อคีย์ใน `.env.local` (ปัจจุบันใช้ `SUPABASE_SERVICE_ROLE_KEY`)
3. ใช้ API ทดสอบที่ `/api/test-env` เพื่อดูว่า Runtime ปกติเห็นค่าหรือไม่

---
*บันทึกเมื่อ: 2026-05-08 โดย Antigravity AI*
