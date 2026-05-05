const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const guideContent = `### 👥 คู่มือการจัดการผู้ใช้ (Account Management)
ยินดีต้อนรับสู่ระบบบริหารจัดการบัญชีผู้ใช้แบบ Unified Identity ที่รวบรวมการจัดการสิทธิ์ทุกระดับไว้ในที่เดียว

---
#### **1. Unified Identity Strategy**
ระบบรองรับการเข้าสู่ระบบ 2 รูปแบบหลัก เพื่อความยืดหยุ่นและความปลอดภัย:
- **Microsoft 365 SSO:** สำหรับพนักงานภายใน (Internal) สามารถใช้บัญชีบริษัท Login ได้ทันที
- **Email & Password/PIN:** สำหรับผู้ใช้ทั่วไปหรือ Partner ภายนอก โดยระบบจะบังคับใช้ Password สำหรับ Staff และ PIN 6 หลักสำหรับ Guest

---
#### **2. การเชื่อมต่อ SSO (Microsoft Linking)**
เพื่อให้พนักงานสามารถใช้ SSO ได้อย่างสมบูรณ์:
1. ผู้ใช้ต้องเข้าไปที่หน้า **My Profile**
2. เลือกแท็บ **เชื่อมต่อ SSO** และกดปุ่ม **Link Microsoft Account**
3. เมื่อเชื่อมต่อสำเร็จ Admin จะเห็นสถานะ ✅ ในหน้าจัดการผู้ใช้ทันที

---
#### **3. ลำดับสิทธิ์ (The 4 Tiers of RBAC)**

#### **Tier 1: Administrator**
**หน้าที่:** ควบคุมระบบสูงสุด, จัดการบัญชีผู้ใช้ทั้งหมด, ตั้งค่า Master Data (เช่น วันหยุด, No. Series) และแก้ไขคู่มือการใช้งาน

#### **Tier 2: Supervisor**
**หน้าที่:** ตรวจสอบภาพรวมผ่าน Dashboard, เรียกดูรายงาน SLA/KPI, จัดการเคส Incident และตรวจสอบประวัติการทำ Backup

#### **Tier 3: Approval**
**หน้าที่:** พิจารณาอนุมัติคำขอเข้าใช้งานของ Guest และลงนามรับรองความถูกต้องในระบบ Checklist ประจำเดือน

#### **Tier 4: Guest**
**หน้าที่:** สร้างเคส Incident (แจ้งซ่อม/แจ้งปัญหา), ติดตามสถานะงานของตัวเอง และกรอกข้อมูล Checklist พื้นฐาน

---
#### **4. ระบบความปลอดภัย Double-Lock**
ระบบมีการป้องกันข้อมูล 2 ชั้น:
1. **Supabase Auth:** ตรวจสอบรหัสผ่านตามมาตรฐานสากล
2. **Identity Whitelist:** ตรวจสอบอีเมลกับทะเบียน SHA-256 Hash เพื่อป้องกันการเข้าถึงจากบุคคลภายนอกที่ไม่ได้รับอนุญาต`;

async function update() {
  const { error } = await supabase.from('system_settings').upsert({ 
    key: 'users_guide_content', 
    value: guideContent,
    updated_at: new Date().toISOString()
  });
  if (error) console.error(error);
  else console.log('Successfully updated users_guide_content in database');
}

update();
