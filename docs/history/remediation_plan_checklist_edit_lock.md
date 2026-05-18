# 📋 Implementation Plan: Checklist Edit Lock Flow & Approval Validation

> **Module Name:** IT Checklist Module  
> **Boundary File:** [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js)  
> **Dependency Component:** [WorkflowActionBar.js](file:///c:/Users/Lenovo/dowa-it-system/components/workflow/WorkflowActionBar.js)  

---

## 🔍 1. Architecture & Background Analysis

### Current Behavior
In the current implementation of the Checklist detail page, all point-level checkmarks (OK/NG) and their nested inputs (`PhotoTemplate`, `ProcedureTemplate`, `MeasureTemplate`, etc.) are **always inline-editable** as long as `doc.status !== 'Closed'` and the user is not an auditor. However:
1. The bottom `WorkflowActionBar` displays a **"✏️ แก้ไข (Edit)"** button that is clickable but performs no action because no `onEdit` handler or edit state has been connected.
2. Users can accidentally click and alter checked items on active checklists since there is no view-only/edit lock toggle.

### Proposed Improvement (User Request)
1. **Initial View Mode (canView):** When entering a checklist page (even if status is `Open` or `In Progress`), it will be in **View Mode** by default. All checklist inputs (OK/NG buttons, nested templates) are disabled and cannot be modified. The "✏️ แก้ไข" button is visible and active on the `WorkflowActionBar`.
2. **Interactive Edit Mode (canEdit):** Clicking "✏️ แก้ไข" triggers Edit Mode. Inputs are unlocked. The "Edit" button transforms into **"💾 บันทึก (Save)"** and **"ยกเลิก (Cancel)"** buttons. 
   - **Save** locks the inputs back to View Mode (with a brief visual saving loading state).
   - **Cancel** re-fetches the database values to discard any unsaved inline visual states and locks back to View Mode.
3. **Autosave Retention:** Since checklist actions trigger real-time, micro-transaction autosaves (`updateItemData`, `handleStatusClick`, `handleNgConfirm`) to Supabase, no manual click to save individual items is needed; the bottom "Save" button acts as an exit-and-lock gate.

---

## 🚨 2. Submission Validation Flow (Question 3 Answer)

The "🚀 ส่งขออนุมัติ (Submit Approval)" button in the `WorkflowActionBar` strictly validates checklist completion using a **100% completion contract** calculated directly in the code:

### Technical Validation Details
The `canSubmit` boolean prop passed to the `WorkflowActionBar` is defined as:
```javascript
canSubmit={!isClosed && doc.workflow_status !== 'pending' && progress === 100}
```
Where `progress` is computed as:
```javascript
const doneCount = items.filter(i => i.status).length
const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
```

### Validation Checklist Rules
* **OK/NG Coverage:** Every item `i` in the `items` array must have a `status` set to either `'OK'` or `'NG'`.
* **Zero Missing Points:** If even a single point is unclicked/null (`status` is empty), `doneCount` will be less than `items.length`, `progress` will be less than 100%, and `canSubmit` evaluates to `false`.
* **Visual state:** The "Submit Approval" button remains hidden/disabled until progress reaches 100%.

---

## 🛠️ 3. Technical Logic & Pseudocode (Non-Intuitive Detailed Planning)

### State Additions
```javascript
const [isEditing, setIsEditing] = useState(false);
```

### Lock Condition Variable
```javascript
const isClosed = doc.status === 'Closed';
const isAuditor = currentUser?.role === 'auditor';
// The document is locked if closed, user is auditor, OR they haven't clicked 'Edit'
const isLocked = isClosed || isAuditor || !isEditing;
```

### Guard Logic in Actions
To ensure database safety, mutation functions are guarded:
```pseudocode
FUNCTION updateItemData(itemId, newData)
    IF isLocked THEN RETURN
    // Perform Supabase update...
END

FUNCTION handleStatusClick(index, newStatus)
    IF isLocked THEN RETURN
    // Perform status toggle...
END

FUNCTION handleNgConfirm(notes)
    IF isLocked THEN RETURN
    // Perform NG toggle...
END
```

---

## 📝 4. Detailed Code Diff (Targeted Code Changes)

```diff
// Target File: app/dashboard/checklist/[id]/page.js

@@ L128 - L144 @@
 export default function ChecklistDetailPage() {
   const { id } = useParams()
   const router = useRouter()
   const [doc, setDoc] = useState(null)
   const [items, setItems] = useState([])
   const [logs, setLogs] = useState([])
   const [incidents, setIncidents] = useState([])
   const [loading, setLoading] = useState(true)
   const [saving, setSaving] = useState(false)
   const [activeNgItem, setActiveNgItem] = useState(null)
   const [activeInstruction, setActiveInstruction] = useState(null)
   const [templates, setTemplates] = useState([]) 
   const [currentUser, setCurrentUser] = useState(null)
   const [showSignatureModal, setShowSignatureModal] = useState(false)
   const [approvalLoading, setApprovalLoading] = useState(false)
   const [workflowSteps, setWorkflowSteps] = useState([])
+  const [isEditing, setIsEditing] = useState(false)

@@ L229 - L264 @@
-  const updateItemData = async (itemId, newData) => {
-    const updatedItems = [...items]
-    const itemIndex = updatedItems.findIndex(i => i.id === itemId)
-    updatedItems[itemIndex].template_data = newData
-    setItems(updatedItems)
-    await supabase.from('checklist_items').update({ template_data: newData }).eq('id', itemId)
-  }
-
-  const handleStatusClick = async (index, newStatus) => {
-    if (doc.status === 'Closed' || isAuditor) return
-    const newItems = [...items]
-    if (newStatus === 'NG') setActiveNgItem({ ...newItems[index], index })
-    else {
-      newItems[index].status = 'OK'; newItems[index].notes = ''
-      setItems(newItems)
-      await supabase.from('checklist_items').update({ status: 'OK', notes: '' }).eq('id', newItems[index].id)
-      if (doc.status === 'Open') {
-        await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
-        setDoc(prev => ({ ...prev, status: 'In Progress' }))
-      }
-    }
-  }
-
-  const handleNgConfirm = async (notes) => {
-    const newItems = [...items]
-    newItems[activeNgItem.index].status = 'NG'; newItems[activeNgItem.index].notes = notes
-    setItems(newItems)
-    await supabase.from('checklist_items').update({ status: 'NG', notes: notes }).eq('id', newItems[activeNgItem.index].id)
-    if (doc.status === 'Open') {
-      await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
-      setDoc(prev => ({ ...prev, status: 'In Progress' }))
-    }
-    setActiveNgItem(null)
-  }
+  const updateItemData = async (itemId, newData) => {
+    if (isLocked) return
+    const updatedItems = [...items]
+    const itemIndex = updatedItems.findIndex(i => i.id === itemId)
+    updatedItems[itemIndex].template_data = newData
+    setItems(updatedItems)
+    await supabase.from('checklist_items').update({ template_data: newData }).eq('id', itemId)
+  }
+
+  const handleStatusClick = async (index, newStatus) => {
+    if (isLocked) return
+    const newItems = [...items]
+    if (newStatus === 'NG') setActiveNgItem({ ...newItems[index], index })
+    else {
+      newItems[index].status = 'OK'; newItems[index].notes = ''
+      setItems(newItems)
+      await supabase.from('checklist_items').update({ status: 'OK', notes: '' }).eq('id', newItems[index].id)
+      if (doc.status === 'Open') {
+        await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
+        setDoc(prev => ({ ...prev, status: 'In Progress' }))
+      }
+    }
+  }
+
+  const handleNgConfirm = async (notes) => {
+    if (isLocked) return
+    const newItems = [...items]
+    newItems[activeNgItem.index].status = 'NG'; newItems[activeNgItem.index].notes = notes
+    setItems(newItems)
+    await supabase.from('checklist_items').update({ status: 'NG', notes: notes }).eq('id', newItems[activeNgItem.index].id)
+    if (doc.status === 'Open') {
+      await supabase.from('checklist_docs').update({ status: 'In Progress' }).eq('id', id)
+      setDoc(prev => ({ ...prev, status: 'In Progress' }))
+    }
+    setActiveNgItem(null)
+  }
+
+  const handleSaveEdit = async () => {
+    setSaving(true)
+    setTimeout(() => {
+      setIsEditing(false)
+      setSaving(false)
+    }, 400)
+  }
+
+  const handleCancelEdit = async () => {
+    setIsEditing(false)
+    await fetchData()
+  }

@@ L268 - L273 @@
   const doneCount = items.filter(i => i.status).length
   const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
   const isClosed = doc.status === 'Closed'
+  const isAuditor = currentUser?.role === 'auditor'
+  const isLocked = isClosed || isAuditor || !isEditing
   const currentStep = workflowSteps.find(s => s.status === 'pending')
   const canApprove = currentStep && (currentStep.approver_id === currentUser?.id || (currentStep.role_required === currentUser?.role && !currentStep.approver_id) || isSubstituteOf(currentUser?.role, currentStep.role_required))

@@ L292 - L304 @@
       <WorkflowActionBar 
         status={doc.status}
-        canSubmit={!isClosed && doc.workflow_status !== 'pending' && progress === 100}
+        canEdit={!isClosed && !isAuditor}
+        isEditing={isEditing}
+        onEdit={() => setIsEditing(true)}
+        onCancelEdit={handleCancelEdit}
+        onSave={handleSaveEdit}
+        canSubmit={!isClosed && doc.workflow_status !== 'pending' && progress === 100}
         canApprove={canApprove}
         canReject={canApprove}
         canReopen={(currentUser?.role === 'admin' || currentUser?.role === 'it_staff') && isClosed}
-        onSave={() => alert('💾 ระบบบันทึกข้อมูลอัตโนมัติขณะแก้ไข')}
         onSubmit={handleSubmitApproval}
         onApprove={() => setShowSignatureModal(true)}
         onReject={handleReject}
         onReopen={handleReopen}
         loading={saving || approvalLoading}
       />

@@ L380 - L382 @@
-                           <TemplateRenderer item={item} template={dbTemplate} onUpdate={(data) => updateItemData(item.id, data)} isClosed={isClosed} isVisitor={isAuditor} />
+                           <TemplateRenderer item={item} template={dbTemplate} onUpdate={(data) => updateItemData(item.id, data)} isClosed={isLocked} isAuditor={isAuditor} />

@@ L400 - L423 @@
                           <button 
                             onClick={() => handleStatusClick(index, 'OK')} 
-                            disabled={isClosed || isAuditor} 
+                            disabled={isLocked} 
                             style={{ 
                               padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '12px', cursor: 'pointer',
                               background: item.status === 'OK' ? '#10b981' : '#f1f5f9', 
                               color: item.status === 'OK' ? '#fff' : '#94a3b8',
                               transition: 'all 0.2s',
-                              opacity: (isClosed || isAuditor) ? 0.6 : 1,
+                              opacity: isLocked ? 0.6 : 1,
                               boxShadow: item.status === 'OK' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                             }}
                           >OK</button>
                           <button 
                             onClick={() => handleStatusClick(index, 'NG')} 
-                            disabled={isClosed || isAuditor} 
+                            disabled={isLocked} 
                             style={{ 
                               padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '12px', cursor: 'pointer',
                               background: item.status === 'NG' ? '#dc2626' : '#f1f5f9', 
                               color: item.status === 'NG' ? '#fff' : '#94a3b8',
                               transition: 'all 0.2s',
-                              opacity: (isClosed || isAuditor) ? 0.6 : 1,
+                              opacity: isLocked ? 0.6 : 1,
                               boxShadow: item.status === 'NG' ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                             }}
                           >NG</button>
```
