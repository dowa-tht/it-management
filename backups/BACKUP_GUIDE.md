# 🔒 Database Backup Guide — Pre-RBAC Checkpoint

**Checkpoint Date:** 2026-04-29  
**Git Tag:** `v1.0-pre-rbac`  
**Purpose:** Backup ก่อนเริ่ม RBAC Implementation

---

## วิธีการ Restore (กรณีฉุกเฉิน)

### 1. Restore โค้ด (Git)
```bash
# ดู tag ที่มีทั้งหมด
git tag -l

# ย้อนกลับไปยัง checkpoint
git checkout v1.0-pre-rbac

# หรือสร้าง branch ใหม่จาก checkpoint
git checkout -b rollback-pre-rbac v1.0-pre-rbac
```

### 2. Restore ฐานข้อมูล (Supabase)
นำไฟล์ SQL ในโฟลเดอร์นี้ไปรันใน **Supabase Dashboard → SQL Editor** ตามลำดับ:
1. `01_schema_backup.sql` — โครงสร้างตารางเดิม (DROP + CREATE)
2. `02_data_backup.sql` — ข้อมูลทั้งหมด (INSERT)

---

## วิธีสร้าง Backup ใหม่

ไปที่ Supabase Dashboard → SQL Editor แล้วรันคำสั่งต่อไปนี้ทีละส่วน
จากนั้น Copy ผลลัพธ์มาบันทึกในไฟล์ `02_data_backup.sql`

```sql
-- Export ข้อมูลทุกตาราง
SELECT * FROM user_profiles;
SELECT * FROM incidents;
SELECT * FROM incident_logs;
SELECT * FROM incident_exclusions;
SELECT * FROM backup_logs;
SELECT * FROM checklist_docs;
SELECT * FROM checklist_items;
SELECT * FROM checklist_logs;
SELECT * FROM holidays;
SELECT * FROM master_data;
SELECT * FROM system_settings;
```
