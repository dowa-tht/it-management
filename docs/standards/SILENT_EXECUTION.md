# SILENT_EXECUTION Skill
<!-- docs/standards/SILENT_EXECUTION.md -->
<!-- อัปเดตใน docs/INDEX.md ทุกครั้งที่แก้ไข -->

## วัตถุประสงค์

Skill นี้บังคับให้ AI ทุก Role ทำงานแบบ **Output-Only Mode** คือคิดภายในแบบเงียบ
และ output เฉพาะสิ่งที่ USER ต้องการเห็นจริงๆ เท่านั้น เพื่อลด token waste จาก
intermediate reasoning ที่ไม่มีคุณค่าต่อ USER

---

## เมื่อใดควรใช้ Skill นี้

| สถานการณ์ | ใช้ Silent Execution |
|---|---|
| Execute Task file (Fast AI) | ✅ บังคับ |
| Implementation ตามแผนที่อนุมัติแล้ว | ✅ บังคับ |
| Bug fix เฉพาะจุดที่ระบุชัด | ✅ บังคับ |
| Code review / Verification | ✅ บังคับ |
| Brainstorming / ยังไม่มีแผน | ❌ ไม่ใช้ (ต้องการ reasoning) |
| USER สั่ง "อธิบายวิธีคิด" / "explain" | ❌ ไม่ใช้ (ยกเว้นชัดเจน) |
| Critical Tier ที่ต้อง confirm assumption | ⚠️ อนุญาต ≤3 bullet สั้น |

---

## กฎ Silent Execution

### ห้ามโดยเด็ดขาด (Forbidden Output Patterns)

```
❌ "กำลังวิเคราะห์..."
❌ "ขั้นแรกฉันจะ..."
❌ "ให้ฉันคิดก่อนว่า..."
❌ "โดยปกติแล้ว pattern นี้จะ..."
❌ "ฉันเห็นว่าโค้ดส่วนนี้..."  ← ถ้าไม่ได้อยู่ใน output จริง
❌ "น่าจะเป็นเพราะ..." ← interim speculation
❌ "ตรวจสอบแล้วพบว่า..." ← ถ้ายังไม่ได้แนบหลักฐาน
```

### อนุญาตเฉพาะ (Allowed Output)

```
✅ Code block ที่สมบูรณ์
✅ Task File (.md) ที่สมบูรณ์
✅ Structured format ที่กำหนดไว้ใน AGENTS.md
   (Role Confirmation, Step Report, ESCALATE, HANDOFF)
✅ คำถามเดียวที่กระชับ เมื่อต้องการ clarify
✅ ผลลัพธ์สุดท้ายพร้อม evidence (file:line)
```

---

## Output Contract ต่อ Role

### Fast AI — Output Contract

เมื่อรับ Task มา ให้ output เฉพาะสิ่งต่อไปนี้ตามลำดับ:

```
1. Role Confirmation block  (ตามรูปแบบ AGENTS.md)
2. [รอ USER ยืนยัน]
3. Code / File changes โดยตรง
4. Step N เสร็จสิ้น block  (ตามรูปแบบ AGENTS.md)
```

ห้ามมีข้อความอื่นแทรกระหว่างขั้นตอนข้างต้น

### Smart AI — Output Contract

เมื่อรับ requirement มา ให้ output เฉพาะสิ่งต่อไปนี้:

```
1. Role Confirmation block  (ตามรูปแบบ AGENTS.md)
2. [รอ USER ยืนยัน]
3. Task File (.md) ที่สมบูรณ์  หรือ  Implementation Plan
4. HANDOFF REPORT block  (ถ้าต้องส่งงานต่อ)
```

ถ้าต้อง confirm assumption ก่อน (Critical Tier เท่านั้น):

```
⚠️ Assumptions (≤3 ข้อ, ต้องการการยืนยัน):
  - [assumption 1]
  - [assumption 2]
พิมพ์ "ยืนยัน" เพื่อดำเนินการต่อ
```

---

## Verbose Mode (Toggle)

USER สามารถเรียก verbose mode ได้ในกรณีต้องการเห็น reasoning:

| USER พิมพ์ | ผล |
|---|---|
| `verbose on` | เปิด reasoning output สำหรับ session นี้ |
| `verbose off` | กลับสู่ Silent Execution mode (default) |
| `อธิบายวิธีคิด` | แสดง reasoning เฉพาะ response นั้น แล้วกลับ silent |
| `explain` | เหมือนกัน |

**Default ของทุก session คือ Silent Execution เสมอ**

---

## ตัวอย่างเปรียบเทียบ

### ❌ แบบที่ห้าม (Verbose / Token Waste)

```
ฉันจะวิเคราะห์โค้ดส่วนนี้ก่อน...
เห็นว่า function handleSubmit() อยู่ที่บรรทัด 42
น่าจะมีปัญหาเรื่อง async/await
ขั้นแรกฉันจะแก้ไข error handling ก่อน
แล้วค่อยไปดู validation...
โดยรวมแล้ว pattern นี้ควรจะ...

[โค้ดจริงออกมาหลังจาก 200 tokens ของ reasoning]
```

### ✅ แบบที่ถูกต้อง (Silent Execution)

```
[โค้ดที่แก้ไขแล้วโดยตรง พร้อม comment ในโค้ดถ้าจำเป็น]

Step 3 เสร็จสิ้น
─────────────────────────────
Output : app/actions/incidents.js แก้ไข handleSubmit() L42-58
Status : Pass
```

---

## การ Self-Monitor

ก่อน output ทุกครั้ง AI ต้องถามตัวเองภายใน:

```
□ output นี้คือผลลัพธ์จริงที่ USER ต้องการ หรือแค่ความคิดระหว่างทาง?
□ มีประโยคที่ขึ้นต้นด้วย "ฉันจะ..." / "กำลัง..." / "น่าจะ..." ไหม?
□ ถ้าลบ output ส่วนนี้ทิ้ง USER จะเสียข้อมูลสำคัญไหม?
  → ถ้าไม่เสีย: ลบทิ้ง
  → ถ้าเสีย: คงไว้
```
