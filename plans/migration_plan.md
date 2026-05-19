# Migration Plan (Production)

## 1️⃣ กำหนดขอบเขตการย้าย
- **GitHub**: ย้ายโค้ดทั้งหมดของโปรเจคไปยัง repository ใหม่
- **Vercel**: สร้างโปรเจคใหม่และเชื่อมต่อกับ GitHub repository ที่สร้าง
- **Supabase**: สร้างโปรเจคใหม่และย้าย **โครงสร้างฐานข้อมูล (schema) + config** เท่านั้น ไม่ย้ายข้อมูล (data) ใด ๆ
  - ใช้ไฟล์ migration ที่อยู่ใน `supabase/migrations/` เพื่อสร้าง schema ใหม่บน Supabase production
  - ไม่ทำการ import/export ตารางข้อมูล

## 2️⃣ สร้าง Repository ใหม่บน GitHub
1. สร้าง repository ชื่อ `dowa-it-system-prod` (หรือชื่อที่ต้องการ) ผ่าน GitHub UI หรือ API
2. ตั้งค่า branch เริ่มต้นเป็น `main`
3. เพิ่มไฟล์ `.gitignore` (ถ้ายังไม่มี) และทำการ commit แรก

## 3️⃣ เชื่อมต่อ Vercel กับ Repository
1. สร้างโปรเจคใหม่บน Vercel
2. เลือก **Import Git Repository** → เชื่อมต่อกับ GitHub repository ที่สร้างในขั้นตอนที่ 2
3. ตั้งค่า Environment Variables ที่จำเป็น (Supabase URL, anon key, etc.)
4. ตรวจสอบว่า Vercel สามารถทำ **build** ได้สำเร็จ (`npm run build`)

## 4️⃣ สร้าง Supabase Project ใหม่
1. สร้างโปรเจคใหม่บน Supabase Dashboard → ตั้งชื่อ `dowa-prod`
2. เปิดใช้งาน Auth, Database, Storage
3. ตั้งค่า **Environment Variables** ใน Vercel ให้สอดคล้องกับ Supabase URL และ anon key ของโปรเจคใหม่

## 5️⃣ ย้ายโค้ดไปยัง Repository ใหม่
```bash
cd c:/Users/Lenovo/dowa-it-system
git init
git add .
git commit -m "Initial commit for production migration"
git remote add origin https://github.com/<your-username>/dowa-it-system-prod.git
git branch -M main
git push -u origin main
```

## 6️⃣ ตั้งค่า CI/CD Pipelines (Vercel)
- Vercel จะทำการ deploy อัตโนมัติเมื่อมีการ push ไปที่ `main`
- หากต้องการ pipeline เพิ่มเติม (เช่น lint, test) สามารถเพิ่มไฟล์ `.github/workflows/deploy.yml`

## 7️⃣ Migration โครงสร้าง DB (Supabase)
```bash
# ติดตั้ง supabase CLI หากยังไม่มี
npm install -g supabase

# ล็อกอินเข้าสู่ Supabase (ใช้ token ของโปรเจคใหม่)
supabase login

# ตั้งค่า project reference
supabase link --project-ref <new-project-ref>

# ดำเนินการ migration ทั้งหมดจากโฟลเดอร์ migrations
supabase db push
```
> **หมายเหตุ**: ไม่ต้องทำการ import data ใด ๆ

## 8️⃣ ทดสอบ End‑to‑End ใน Staging
1. สร้าง environment **staging** บน Vercel (preview deployment)
2. ตรวจสอบฟีเจอร์สำคัญ: login, checklist, incident flow, report generation
3. ตรวจสอบการเชื่อมต่อ Supabase (schema ถูกสร้างและ RLS ทำงานตามที่กำหนด)

## 9️⃣ เอกสาร Migration Steps
- เพิ่มรายละเอียดขั้นตอนใน `README.md`
- สร้างไฟล์ `docs/plan/migration_guide.md` สรุปขั้นตอนทั้งหมดและวิธี rollback

## 🔟 แผนเปิด Production & Rollback
1. กำหนดวันเปิด Production (เช่น 2026‑06‑01)
2. เตรียม **backup** ของฐานข้อมูลเดิม (แม้จะไม่ย้าย data) เพื่อใช้กรณีฉุกเฉิน
3. หากพบปัญหาให้ทำ **rollback** โดย:
   - ปิดการทำงานของ Vercel production deployment
   - รีเซ็ต Supabase project (ลบ schema แล้วรัน migration ใหม่)
   - Deploy เวอร์ชันก่อนหน้าจาก GitHub (git revert หรือ checkout commit ก่อนหน้า)

---

*ไฟล์นี้จัดเก็บใน `plans/` เพื่อให้ทีมสามารถอ้างอิงได้ง่าย*

