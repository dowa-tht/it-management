# Audit Report: Incident Screen 404 / Route Runtime Desync

**Date:** 08-Jun-2026  
**Module:** Incident  
**Scope:** `/dashboard/incidents` และหน้า dashboard child routes ที่เกี่ยวข้อง

---

## Summary

หน้าจอ `Incident` ใช้งานไม่ได้เพราะ Next.js runtime ที่รันอยู่บน `localhost:3000` กำลัง resolve `/dashboard/incidents` ไปยัง built-in `not-found` page ทั้งที่ route file มีอยู่จริงในโค้ดและถูก compile ไว้แล้ว

ดังนั้นปัญหานี้ **ไม่ใช่ bug ภายใน logic ของหน้า Incident โดยตรง** แต่เป็นปัญหา **route registry / dev runtime desync** ของ Next.js ระหว่าง filesystem กับ runtime route tree ที่กำลังให้บริการอยู่

**Resolution status:** Fixed on local runtime by restarting the Next.js dev server from the current workspace.

---

## Evidence

### 1. Route file ของ Incident มีอยู่จริง

- `app/dashboard/incidents/page.js` มีอยู่จริงและเริ่มต้นเป็น page component ของหน้า Incident ที่บรรทัด [1-15](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/incidents/page.js)
- `app/dashboard/layout.js` มีอยู่จริงและเป็น parent layout ของ dashboard subtree ที่บรรทัด [1-10](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/layout.js)

สอดคล้องกับ Next.js Project Structure ว่า route จะ public ได้เมื่อมี `page.js` อยู่ใน segment และ layout สามารถ wrap child segments ได้

### 2. Next.js build output มองเห็น route นี้

- `.next/server/app-paths-manifest.json` ระบุ route ของ Incident ชัดเจนที่ [40-42](file:///c:/Users/Lenovo/dowa-it-system/.next/server/app-paths-manifest.json)
  - `"/dashboard/incidents/[id]/page"`
  - `"/dashboard/incidents/new/page"`
  - `"/dashboard/incidents/page"`

แปลว่า filesystem และ build artifacts รู้จัก route นี้แล้ว

### 3. Runtime จริงตอบ 404 จาก document request

จาก browser automation:

- `GET http://localhost:3000/dashboard/incidents` ได้ `404 Not Found`
- หน้าแสดงข้อความ `404 This page could not be found.`

และเมื่อดึง runtime page metadata จาก Next.js MCP:

- `/dashboard` ถูก resolve เข้า `app/dashboard/layout.js` และ `app/dashboard/page.js` ตามปกติ
- แต่ `/dashboard/incidents` ถูก resolve ไปที่:
  - `app/layout.js`
  - built-in `not-found.js`

นั่นหมายความว่า runtime route tree ที่กำลัง serve อยู่ **ไม่ได้ mount segment `app/dashboard/...` สำหรับ child routes** แม้ไฟล์จริงจะมีอยู่

### 4. Proxy ของ Next.js 16 ก็ยังไม่ถูก register ใน runtime ปัจจุบัน

- โปรเจกต์มี `proxy.js` อยู่จริงที่ [1-80](file:///c:/Users/Lenovo/dowa-it-system/proxy.js)
- แต่ `.next/server/middleware-manifest.json` ยังว่างที่ [1-5](file:///c:/Users/Lenovo/dowa-it-system/.next/server/middleware-manifest.json)

ตามเอกสาร Next.js 16, `proxy.js` เป็น top-level file convention สำหรับ request proxy ก่อน route render ดังนั้นสถานะที่ manifest ยังว่างเป็นสัญญาณเพิ่มว่า dev server/runtime ปัจจุบันยังไม่ sync กับ filesystem state ล่าสุด

---

## Root Cause

**Root cause หลัก:** Next.js dev runtime ที่พอร์ต `3000` อยู่ในสภาวะ route/runtime desync

อาการที่พบ:

1. Route files มีอยู่จริง
2. Build artifacts รู้จัก route
3. Runtime ที่รับ request จริงกลับตอบ built-in `not-found`
4. Proxy convention (`proxy.js`) ยังไม่ถูก register ใน manifest ของ runtime นี้

จึงสรุปได้ว่าปัญหาอยู่ที่ **development server state** มากกว่าที่ source code ของหน้า Incident เอง

---

## Why This Is Not an Incident Page Logic Bug

หากเป็น bug ภายใน `app/dashboard/incidents/page.js` โดยตรง ปกติควรเห็นหนึ่งในอาการต่อไปนี้:

- runtime/build error
- hydration error
- error boundary
- หน้าโหลดแล้วข้อมูล query ล้มเหลว

แต่สิ่งที่เกิดขึ้นคือ server ตอบ `404 document` ตั้งแต่ก่อน page component จะถูก render จึงตัดประเด็น query logic หรือ UI logic ของ Incident ออกไปได้ในรอบนี้

---

## Recommended Fix

### Fix Now

1. หยุด dev server ที่รันอยู่
2. ลบ cache `.next`
3. start dev server ใหม่
4. ทดสอบใหม่ที่:
   - `/dashboard`
   - `/dashboard/incidents`
   - `/dashboard/backup`
   - `/dashboard/checklist`

ตัวอย่างคำสั่ง:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### Verify After Restart

ต้องยืนยัน 3 จุด:

1. `/dashboard/incidents` ไม่ตอบ 404 แล้ว
2. Next.js page metadata ของ `/dashboard/incidents` ต้อง include:
   - `app/dashboard/layout.js`
   - `app/dashboard/incidents/page.js`
3. `.next/server/middleware-manifest.json` หรือ runtime metadata ต้องสะท้อนว่า `proxy.js` ถูก register แล้ว

---

## Secondary Checks If Problem Persists

ถ้า restart แล้วยัง 404 ต่อ ให้ตรวจต่อในลำดับนี้:

1. ตรวจว่ามี dev server ค้างหลายตัวและเปิดคนละ working tree
2. ตรวจ terminal startup logs ว่ามี warning ตอน scan App Router หรือไม่
3. ตรวจว่ามี HMR cache corruption หรือ route tree ค้างจากการ rename/move folder ก่อนหน้า
4. ปิด server ทั้งหมดแล้ว start ใหม่จาก `C:\Users\Lenovo\dowa-it-system` โดยตรง

---

## Standards Alignment

- สอดคล้องกับ `docs/standards/INCIDENT_MANAGEMENT.md` ในแง่ module boundary: งานนี้อยู่ในโมดูล `Incident`
- สอดคล้องกับ `docs/standards/ZERO_HACK_POLICY.md`: ไม่ควรแก้ด้วย UI hack หรือ redirect hack เพื่อซ่อน 404
- สอดคล้องกับ Next.js docs:
  - Project Structure: route ต้องมาจาก `page.js`/`layout.js`
  - Proxy file convention: `proxy.js` ต้องถูก register เป็น top-level convention

---

## Final Conclusion

สาเหตุของหน้าจอ Incident ใช้งานไม่ได้คือ **Next.js dev server state เพี้ยนจาก source tree ปัจจุบัน** ทำให้ route ลูกใต้ `/dashboard` ถูก resolve ไปหน้า 404 แม้ไฟล์ route จะมีอยู่จริง

วิธีแก้หลักคือ **restart dev server พร้อมล้าง `.next` cache** แล้วตรวจ route runtime ใหม่ก่อนลงมือแก้โค้ด Incident เพิ่มเติม

---

## Resolution Verification

หลัง restart dev server จาก workspace ปัจจุบัน:

- `/dashboard/incidents` เปิดได้ตามปกติและโหลดข้อมูล `incidents` / `document_approvals` สำเร็จจาก API
- `/dashboard/backup` เปิดได้ตามปกติ
- Next.js MCP runtime metadata ของ `/dashboard/backup` กลับมาเห็น `app/dashboard/layout.js` และ `app/dashboard/backup/page.js` ตาม route tree ที่ถูกต้อง
- ไม่พบ `configErrors` หรือ `sessionErrors` จาก `get_errors`

สรุป: ปัญหาเกิดจาก **runtime state ของ dev server ครั้งก่อน** และถูกแก้แล้วด้วยการ restart server ใหม่จาก workspace นี้
