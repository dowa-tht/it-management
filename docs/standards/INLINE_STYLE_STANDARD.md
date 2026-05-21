# Inline Style Standard for Settings Pages

**Status:** Active Standard — Mandatory  
**Scope:** ทุกหน้าภายใต้ `/dashboard/settings/*` และ Component ใดก็ตามที่พบปัญหา Tailwind class ไม่มีผล  
**Root Cause Discovered:** 2026-05-20  
**Last Updated:** 2026-05-20

---

## 1. ที่มาของปัญหา (Root Cause)

### อาการ
- เขียน Tailwind class เช่น `px-8 py-7`, `gap-5`, `text-xs` ลงใน JSX แล้ว **ไม่มีผล** บนหน้าจอจริง
- UI ยังคงชิดขอบ ไม่มี padding/spacing แม้จะแก้ไข className ซ้ำหลายรอบ
- Class เดิมที่เคยใช้อยู่แล้วยังทำงานได้ปกติ แต่ class ใหม่ที่เพิ่มเข้าไปไม่มีผล

### สาเหตุที่ตรวจพบ

**Tailwind JIT (Just-In-Time) scan ไม่ครอบคลุมไฟล์ใหม่หรือไฟล์ที่เพิ่ม class ใหม่**

Tailwind v3+ ใช้ JIT mode ที่ scan source files เพื่อ generate CSS เฉพาะ class ที่พบจริงใน codebase  
หาก `tailwind.config.js` → `content` pattern ไม่ครอบคลุม path ที่ไฟล์อยู่ หรือ class นั้นไม่เคยถูก generate มาก่อน  
— CSS class นั้นจะ **ไม่ถูก generate** และไม่มีผลบนหน้าจอ

### หลักฐาน
- `app/dashboard/settings/users/page.js` ทำงานได้ถูกต้อง **เพราะไม่ใช้ Tailwind เลย** ใช้ `style={{...}}` inline และ `<style>{CSS}</style>` แทนทั้งหมด
- `app/dashboard/settings/target-registry/TargetRegistryClient.js` เดิมใช้ Tailwind class → padding/spacing ไม่มีผล → แก้ให้เป็น inline style → ทำงานได้ทันที

---

## 2. มาตรฐานบังคับ: ใช้ Inline Style สำหรับทุก Settings Page

### 2.1 กฎหลัก

> **[MANDATORY]** หน้าทุกหน้าภายใต้ `/dashboard/settings/*` ต้องใช้ `style={{...}}` inline หรือ `<style>{CSS string}</style>` เป็นหลัก  
> **ห้ามพึ่ง Tailwind class สำหรับ spacing, padding, margin, gap, font-size, color** ในส่วนที่ต้องการความแม่นยำสูง

### 2.2 สิ่งที่ทำได้ (Allowed)

| ใช้ได้ | ตัวอย่าง |
|---|---|
| `style={{...}}` inline object | `style={{ padding: '24px 32px', borderRadius: 12 }}` |
| `<style>{CSS}</style>` ฝังใน JSX | ใส่ไว้ใน top-level component |
| Tailwind class ที่ **มีอยู่แล้ว** และทำงานได้แน่นอน | `className="flex items-center"` (ถ้ามั่นใจ) |
| Tailwind สำหรับ layout utility ทั่วไปที่ไม่ sensitive | `grid`, `flex`, `hidden`, `block` |

### 2.3 สิ่งที่ห้ามทำ (Forbidden)

| ห้ามทำ | เหตุผล |
|---|---|
| ใช้ Tailwind class ใหม่ที่ไม่เคยมีใน codebase | JIT อาจไม่ generate |
| เพิ่ม `padding`, `gap`, `margin` ผ่าน Tailwind class ใหม่ | ไม่การันตีว่ามีผล |
| แก้ spacing ปัญหาด้วยการสลับ Tailwind class | วน loop ไม่รู้จบ |

---

## 3. Pattern มาตรฐาน (Reference Implementation)

### 3.1 Style Object Constants (`const S = {...}`)

สร้าง shared style object ที่ด้านบนของไฟล์เพื่อ reuse ได้ทั้งไฟล์:

```js
// ── Shared styles ──────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '24px 32px',           // ← กำหนด padding ที่นี่ ไม่ผ่าน Tailwind
    borderBottom: '1px solid #f1f5f9',
    background: '#fafafa',
  },
  cardBody: {
    padding: '28px 32px',           // ← กำหนด padding ที่นี่
  },
  cardFooter: {
    padding: '16px 32px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  input: {
    width: '100%',
    padding: '10px 14px',           // ← กำหนด padding ที่นี่
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,                         // ← กำหนด gap ที่นี่
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,                        // ← กำหนด gap ที่นี่
  },
}
```

### 3.2 การใช้ Style Object

```jsx
// ✅ ถูกต้อง — inline style
<section style={S.card}>
  <div style={S.cardHeader}>
    <div>
      <p style={S.label}>Target Record</p>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Create Target</h2>
    </div>
  </div>
  <div style={S.cardBody}>
    <div style={S.formGrid}>
      <div style={S.fieldGroup}>
        <label style={S.label}>Target Code</label>
        <input value={...} style={S.input} />
      </div>
    </div>
  </div>
</section>

// ❌ ผิด — Tailwind class ที่อาจไม่มีผล
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="px-8 py-6 border-b border-slate-100">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
```

### 3.3 Embedded CSS สำหรับ Pseudo-class และ Responsive

ใช้ `<style>` ฝังใน top-level component สำหรับ:
- `:hover`, `:focus`, `::placeholder`
- `@media` responsive breakpoint
- Global box-sizing reset

```jsx
export function MySettingsPage() {
  return (
    <div>
      <style>{`
        * { box-sizing: border-box; }
        .my-input:focus { 
          border-color: #93c5fd !important; 
          box-shadow: 0 0 0 3px rgba(147,197,253,0.25) !important; 
          background: #fff !important; 
        }
        .my-btn:hover { filter: brightness(1.08); }
        @media (max-width: 768px) {
          .my-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* ... content ... */}
    </div>
  )
}
```

### 3.4 Span 2 Column ใน Grid

สำหรับ field ที่ต้องกินพื้นที่เต็มแถว ใช้ spread:

```jsx
// ✅ ถูกต้อง
<div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
  <label style={S.label}>Target Name</label>
  <input value={...} style={S.input} />
</div>

// ❌ ผิด — Tailwind class ที่อาจไม่มีผล
<div className="grid gap-1.5 md:col-span-2">
```

---

## 4. Design Token มาตรฐาน

ค่าที่ใช้ทั่วทั้งระบบ Settings ต้องยึดตาม token นี้:

### 4.1 Spacing

| Token | Value | ใช้กับ |
|---|---|---|
| Card header padding | `24px 32px` | Header zone ของ card |
| Card body padding | `28px 32px` | Form fields zone |
| Card footer padding | `16px 32px` | Action/save zone |
| Field gap (label→input) | `6px` | ระหว่าง label กับ input |
| Grid gap (field→field) | `20px` | ระหว่าง field group |
| List item padding | `12px 14px` | Item ใน list/sidebar |

### 4.2 Typography

| Token | Value | ใช้กับ |
|---|---|---|
| Eyebrow/Badge label | `11px, 700, uppercase, tracking 0.18em` | Section label เช่น "Target Record" |
| Form label | `11-12px, 700, uppercase, tracking 0.08em, #64748b` | Label เหนือ input |
| Input text | `14px, 400-500, #0f172a` | ข้อความใน input |
| Subtitle/Description | `13-14px, 400, #64748b, line-height 1.6` | คำอธิบายใต้ heading |

### 4.3 Border & Radius

| Token | Value | ใช้กับ |
|---|---|---|
| Card radius | `20px` | Card ทุกประเภท |
| Input radius | `10px` | Input, Select, Textarea |
| Button radius | `10px` | Button ทุกประเภท |
| Small badge radius | `20px` | Status badge |
| Card border | `1px solid #e2e8f0` | Card border |
| Input border | `1px solid #e2e8f0` | Input border |
| Divider | `1px solid #f1f5f9` | แบ่ง section ใน card |

### 4.4 Colors

| Token | Value | ใช้กับ |
|---|---|---|
| Page background | `#f8fafc` | Background ของหน้า |
| Card background | `#ffffff` | Card/form background |
| Card header bg | `#fafafa` | Header zone ของ card |
| Input background | `#f8fafc` | Input normal state |
| Input focus bg | `#ffffff` | Input เมื่อ focus |
| Primary blue | `#2563eb` | Primary button |
| Primary violet | `#7c3aed` | Group action button |
| Label color | `#64748b` | Form label text |
| Body text | `#0f172a` | ข้อความหลัก |
| Muted text | `#94a3b8` | ข้อความรอง |
| Active badge (green) | bg `#dcfce7`, text `#16a34a` | Active status |
| Error text | `#dc2626` | Error message |

### 4.5 Card Anatomy

```
┌─────────────────────────────────────────────┐
│  [cardHeader] padding: 24px 32px            │ ← Header zone
│  bg: #fafafa, border-bottom: 1px solid      │
│  ┌─ eyebrow (11px, uppercase, color)        │
│  │  heading (20px, 800)                     │
│  └─ subtitle (13px, #64748b)     [NewBtn]   │
├─────────────────────────────────────────────┤
│  [cardBody] padding: 28px 32px              │ ← Field zone
│  ┌─ [formGrid] display:grid, gap:20px       │
│  │  ┌─ [fieldGroup] flex-col, gap:6px       │
│  │  │  <label> 11px uppercase               │
│  │  │  <input> padding:10px 14px            │
│  │  └─ [error] 12px, #dc2626               │
│  └─────────────────────────────────────────│
├─────────────────────────────────────────────┤
│  [cardFooter] padding: 16px 32px            │ ← Action zone
│  border-top: 1px solid #f1f5f9             │
│                              [SaveButton]   │
└─────────────────────────────────────────────┘
```

---

## 5. Reference Implementation

ไฟล์ที่ใช้เป็น Reference ที่ถูกต้อง:

| ไฟล์ | Pattern | หมายเหตุ |
|---|---|---|
| `app/dashboard/settings/users/page.js` | `style={{}}` + `<style>` | Reference หลัก ทำงานถูกต้อง |
| `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `const S + style={{}}` + `<style>` | ใช้ `const S` pattern ที่ reusable |
| `app/dashboard/settings/permissions/page.js` | `style={{}}` inline | Reference สำหรับ permission matrix |

---

## 6. Migration Guide (สำหรับไฟล์ที่ยังใช้ Tailwind)

หากพบหน้า Settings ที่ยังใช้ Tailwind class และมีปัญหา spacing/padding ให้ทำตามขั้นตอน:

### Step 1 — Identify ปัญหา
```bash
# ตรวจสอบว่าไฟล์ใช้ Tailwind class หรือ inline style
grep -n "className=" app/dashboard/settings/[page]/page.js | head -20
```

### Step 2 — สร้าง Style Object
```js
// เพิ่มที่ด้านบนไฟล์ก่อน component ทั้งหมด
const S = {
  card: { /* ... */ },
  cardHeader: { /* ... */ },
  // ...
}
```

### Step 3 — แปลง className → style
```jsx
// Before (Tailwind — อาจไม่มีผล)
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <label className="text-sm font-bold text-slate-700">Name</label>
  <input className="rounded-xl border border-slate-200 px-4 py-3" />
</div>

// After (inline — การันตีมีผล)
<div style={S.card}>
  <div style={S.cardBody}>
    <div style={S.fieldGroup}>
      <label style={S.label}>Name</label>
      <input style={S.input} />
    </div>
  </div>
</div>
```

### Step 4 — เพิ่ม `<style>` สำหรับ hover/focus/responsive
```jsx
<style>{`
  * { box-sizing: border-box; }
  .my-input:focus { border-color: #93c5fd !important; }
  @media (max-width: 768px) {
    .my-grid { grid-template-columns: 1fr !important; }
  }
`}</style>
```

---

## 7. Checklist ก่อนส่งงาน Settings Page

- [ ] ทุก card/section มี padding ผ่าน `style={{}}` ไม่ใช่ Tailwind class
- [ ] ทุก input/textarea มี `padding: '10px 14px'` ผ่าน inline style
- [ ] ทุก label ใช้ `style={S.label}` หรือ equivalent inline object
- [ ] มี `<style>` สำหรับ `:focus`, `:hover`, `@media` ที่จำเป็น
- [ ] `box-sizing: border-box` ถูก set ไว้แล้ว (ผ่าน `* { box-sizing: border-box; }`)
- [ ] ทดสอบว่า spacing ปรากฏถูกต้องบนหน้าจอจริง ไม่ใช่แค่ดูโค้ด

---

## 8. Relationship กับเอกสารอื่น

- ใช้ร่วมกับ [UI_UX_SETTINGS_DESIGN_SYSTEM.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md) สำหรับ layout pattern
- ใช้ร่วมกับ [UI_UX_RESPONSIVE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_RESPONSIVE.md) สำหรับ responsive rules
- ใช้ร่วมกับ [ZERO_HACK_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ZERO_HACK_POLICY.md) สำหรับ no-hack rules
