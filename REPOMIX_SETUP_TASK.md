# TASK: ติดตั้งและรัน Repomix เพื่อ Export Codebase

## Agent Info
- **Role:** Fast AI
- **Step:** 1 of 1
- **Input:** โปรเจกต์ที่ path `C:\Users\Lenovo\dowa-it-system`
- **Output:** ไฟล์ `repomix-output.md` ใน root ของ project

---

## Objective
ติดตั้ง Repomix, สร้าง config file, และรัน export codebase ของโปรเจกต์ DOWA IT System
ออกมาเป็น `repomix-output.md` เพื่อนำไปใช้ใน Gemini AI Studio

---

## Constraints (ห้ามทำ)
- ห้ามแก้ไขไฟล์โค้ดใดๆ ในโปรเจกต์
- ห้ามลบหรือย้ายไฟล์ที่มีอยู่
- ห้ามรัน `npm run dev` หรือ command ที่เกี่ยวข้องกับ development server
- ห้ามแก้ไข `.env` หรือ `.env.local`
- ถ้าไฟล์ `repomix.config.json` มีอยู่แล้ว ให้รายงาน USER ก่อน อย่า overwrite ทันที

---

## Step-by-Step Instructions

### Step 1 — ตรวจสอบ Node.js และ npm

```bash
node --version
npm --version
```

**Expected:** Node.js v18+ และ npm v9+  
**ถ้าไม่ผ่าน:** รายงาน USER ว่าต้องติดตั้ง Node.js ก่อน หยุดทำงาน

---

### Step 2 — ติดตั้ง Repomix

```bash
npm install -g repomix
```

ตรวจสอบว่าติดตั้งสำเร็จ

```bash
repomix --version
```

**Expected:** แสดง version เช่น `0.2.x`  
**ถ้าไม่ผ่าน:** Escalate ทันที พร้อมแจ้ง error message

---

### Step 3 — เข้าไปใน Project Directory

```bash
cd C:\Users\Lenovo\dowa-it-system
```

ตรวจสอบว่าอยู่ถูก path

```bash
dir package.json
```

**Expected:** เห็นไฟล์ `package.json`  
**ถ้าไม่ผ่าน:** Escalate ทันที แจ้ง path ที่ถูกต้องให้ USER ระบุ

---

### Step 4 — สร้าง repomix.config.json

สร้างไฟล์ `repomix.config.json` ที่ root ของ project ด้วยเนื้อหาดังนี้:

```json
{
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown",
    "showLineNumbers": true,
    "copyToClipboard": false
  },
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": [
      "node_modules/**",
      ".next/**",
      ".git/**",
      "*.log",
      "repomix-output*",
      "backups/**",
      "scratch/**",
      ".env*",
      "*.lock",
      "public/**",
      "devserver*.log",
      "*.bak",
      "*.csv"
    ]
  },
  "include": [
    "app/**/*.js",
    "components/**/*.js",
    "lib/**/*.js",
    "supabase/migrations/**/*.sql",
    "docs/**/*.md",
    "ai-tasks/**/*.md",
    "AGENTS.md",
    "CLAUDE.md",
    "schema.sql",
    "supabase_types.ts",
    "package.json",
    "next.config.mjs",
    "jsconfig.json"
  ]
}
```

---

### Step 5 — รัน Repomix

```bash
repomix
```

รอจนเสร็จ จะมี output แสดงจำนวนไฟล์และ estimated token count

---

### Step 6 — ตรวจสอบผลลัพธ์

```bash
dir repomix-output.md
```

ตรวจสอบขนาดไฟล์:

- **ต่ำกว่า 10MB และ token ต่ำกว่า 800,000** → ผ่าน ดำเนินการต่อ
- **เกิน 10MB หรือ token เกิน 800,000** → ทำ Step 6b

#### Step 6b — ถ้าไฟล์ใหญ่เกินไป (ทำเฉพาะเมื่อ Step 6 ไม่ผ่าน)

แก้ไข `repomix.config.json` โดยเปลี่ยน `include` เป็น round แรกก่อน:

```json
"include": [
  "app/actions/**/*.js",
  "app/dashboard/**/*.js",
  "lib/**/*.js",
  "AGENTS.md",
  "package.json"
]
```

แล้วรันใหม่พร้อมเปลี่ยนชื่อ output:

```json
"output": {
  "filePath": "repomix-output-part1.md"
}
```

รัน: `repomix`

จากนั้นเปลี่ยน include เป็น round สอง:

```json
"include": [
  "components/**/*.js",
  "supabase/migrations/**/*.sql",
  "docs/**/*.md",
  "schema.sql",
  "supabase_types.ts"
]
```

เปลี่ยน output เป็น `repomix-output-part2.md` แล้วรัน: `repomix`

---

### Step 7 — เปิดไฟล์ตรวจสอบเบื้องต้น

```bash
# ดู 50 บรรทัดแรก
type repomix-output.md | more
```

ตรวจสอบว่า:
- [ ] มีรายชื่อไฟล์ขึ้นต้น
- [ ] มีเนื้อหาโค้ดจริง ไม่ใช่แค่ path เปล่า
- [ ] ไม่มีข้อมูล sensitive เช่น API keys หรือ passwords (ควรถูก filter โดย .gitignore แล้ว)

---

## Acceptance Criteria

- [ ] ติดตั้ง repomix สำเร็จ (`repomix --version` ทำงานได้)
- [ ] มีไฟล์ `repomix.config.json` อยู่ใน root ของ project
- [ ] มีไฟล์ `repomix-output.md` (หรือ part1/part2 ถ้าไฟล์ใหญ่) อยู่ใน root ของ project
- [ ] ขนาดไฟล์ไม่เกิน 10MB ต่อไฟล์
- [ ] ไม่มีข้อมูล sensitive ใน output

---

## Escalate ทันทีถ้า

- `npm install -g repomix` ล้มเหลว
- ไม่พบ `package.json` ใน path ที่ระบุ
- มีไฟล์ `repomix.config.json` อยู่แล้ว (ถามก่อน overwrite)
- `repomix` รันแล้ว error ไม่สร้างไฟล์

---

## รายงานผลเมื่อเสร็จ

```
TASK COMPLETE: REPOMIX_SETUP
─────────────────────────────
Status        : Pass / Fail
Output file   : [ชื่อไฟล์ที่สร้าง]
File size     : [ขนาด MB]
Token count   : [จำนวน token โดยประมาณ]
Files packed  : [จำนวนไฟล์ที่ include]
Split         : Yes / No (ถ้า split เป็น part1/part2)
─────────────────────────────
พร้อมสำหรับ Upload ไปยัง Gemini AI Studio
```
