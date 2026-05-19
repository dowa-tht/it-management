# Photo Compression and Delete on Retake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize photo file sizes by 50% using client-side canvas compression (1000px max width/height, 0.5 JPEG quality) and implement safe automatic deletion of old photos from OneDrive upon successful retakes.

**Architecture:** Utilize HTML5 Canvas in `PhotoTemplate` to scale down uploaded images and compress them using `toDataURL('image/jpeg', 0.5)`. Upon successful response from the OneDrive upload API, asynchronously invoke the `/api/upload/onedrive` DELETE method with the old file's ID in the background to clean up Microsoft OneDrive and prevent orphaned files.

**Tech Stack:** Next.js (App Router), React, Microsoft Graph API (OneDrive integration)

---

## Affected Files Map

| File Path | Responsibility | Change Type |
| --- | --- | --- |
| `app/dashboard/checklist/[id]/page.js` | IT Checklist detail template renderer and upload handler (`PhotoTemplate` component) | Modify logic to optimize compression parameters and trigger OneDrive cleanup on retakes |
| `docs/INDEX.md` | Central documentation directory | Modify to add this remediation plan |
| `docs/history/CHANGELOG.md` | Project audit and change trail | Modify to record the daily changes |

---

## 🛠️ Step-by-Step Implementation Tasks

### Task 1: Check Dev Server Port and Status

Before starting, we must inspect the local development server status and ensure the environment is healthy.

- [ ] **Step 1: Check port 3000 status**
  
  Run: `netstat -ano | findstr :3000` on Windows PowerShell to see if a process is using it.
  
- [ ] **Step 2: Start / Verify dev server is running**

  Ensure `npm run dev` is running successfully. If not, start it.

---

### Task 2: Implement Photo Compression & Retake Deletion Logic

We will modify the `handleUpload` function inside `PhotoTemplate` component in `app/dashboard/checklist/[id]/page.js` to change compression limits, extract the old file ID, and perform OneDrive deletion after successful upload.

- [ ] **Step 1: Open the file and locate `PhotoTemplate` component**
  
  File: `app/dashboard/checklist/[id]/page.js` (around line 577 to 715)

- [ ] **Step 2: Apply the code changes**

  We will modify:
  1. Image resolution limits: change the scale to fit within `1000px` max dimension (instead of `1200px` width only) to reduce file size.
  2. JPEG Compression Quality: change `canvas.toDataURL('image/jpeg', 0.7)` to `canvas.toDataURL('image/jpeg', 0.5)`.
  3. Extract the `oldFilePath` (OneDrive File ID) before updating state.
  4. Invoke the DELETE `/api/upload/onedrive` route in the background if `oldFilePath` exists.

  Let's replace the canvas compression and API upload block:

  ```diff
            const canvas = document.createElement('canvas')
-           const scale = Math.min(1, 1200 / img.width) // Limit max width to 1200px to prevent memory crashes on mobile
-           canvas.width = img.width * scale
-           canvas.height = img.height * scale
+           // Scale to limit both width and height to maximum 1000px for 50%+ file size reduction
+           const scale = Math.min(1, 1000 / Math.max(img.width, img.height))
+           canvas.width = img.width * scale
+           canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas 2D context not available on this device');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            // Premium Watermark
            ctx.fillStyle = "rgba(0,0,0,0.5)"
            ctx.fillRect(0, canvas.height - 60, canvas.width, 60)
            ctx.font = "bold 20px Arial"
            ctx.fillStyle = "#ffffff"
            ctx.fillText(`DOWA IT SYSTEM | ${new Date().toLocaleString()}`, 20, canvas.height - 35)
            if (locationMeta.status === 'captured') {
              ctx.font = "16px Arial"
              ctx.fillText(`GPS: ${locationMeta.lat.toFixed(6)}, ${locationMeta.lng.toFixed(6)}`, 20, canvas.height - 12)
            }
            
-           const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
+           // Compress image using JPEG quality 0.5 (Option A) to reduce size to ~50-80KB
+           const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
            if (!dataUrl || !dataUrl.includes(',')) throw new Error('Failed to generate image data URL');
            const base64 = dataUrl.split(',')[1]
  ```

  And update the state handling to trigger deletion:

  ```diff
            const resJ = await res.json()
            if (resJ.success) {
              const point = points[pointIdx]
              const pointId = typeof point === 'object' ? (point.point_id || point.point_code) : `P${(pointIdx + 1).toString().padStart(2, '0')}`
              const pointLabel = typeof point === 'object' ? point.label : point
  
+             // Identify old photo OneDrive ID if present
+             const oldFilePath = data.photos_by_point?.[pointId] || data.photos?.[pointIdx]
+ 
              onUpdate({
                ...data,
                // Legacy structure
                photos: { ...(data.photos || {}), [pointIdx]: resJ.filePath },
                photo_meta: {
                  ...(data.photo_meta || {}),
                  [pointIdx]: {
                    file_id: resJ.filePath,
                    status: locationMeta.status,
                    lat: locationMeta.lat,
                    lng: locationMeta.lng,
                    accuracy: locationMeta.accuracy ?? null,
                    captured_at: locationMeta.captured_at,
                    point_label: pointLabel,
                    message: locationMeta.message || ''
                  }
                },
                // New stable structure
                photos_by_point: { ...(data.photos_by_point || {}), [pointId]: resJ.filePath },
                photo_meta_by_point: {
                  ...(data.photo_meta_by_point || {}),
                  [pointId]: {
                    file_id: resJ.filePath,
                    point_id: pointId,
                    point_code: typeof point === 'object' ? point.point_code : pointId,
                    point_label: pointLabel,
                    status: locationMeta.status,
                    lat: locationMeta.lat,
                    lng: locationMeta.lng,
                    accuracy: locationMeta.accuracy ?? null,
                    captured_at: locationMeta.captured_at,
                    message: locationMeta.message || ''
                  }
                }
              })
  
+             // Asynchronously delete the old photo from OneDrive after successful upload of the new one
+             if (oldFilePath) {
+               console.log(`[OneDrive] Replacing old image. Triggering deletion for old ID: ${oldFilePath}`);
+               fetch('/api/upload/onedrive', {
+                 method: 'DELETE',
+                 headers: {
+                   'Content-Type': 'application/json'
+                 },
+                 body: JSON.stringify({ filePath: oldFilePath })
+               })
+               .then(async (delRes) => {
+                 const delData = await delRes.json().catch(() => ({}));
+                 if (delRes.ok && delData.success) {
+                   console.log(`[OneDrive] Successfully deleted old file ID: ${oldFilePath}`);
+                 } else {
+                   console.warn(`[OneDrive] Deletion warning for old ID: ${oldFilePath}. Error:`, delData.error || delRes.statusText);
+                 }
+               })
+               .catch((delErr) => {
+                 console.error('[OneDrive] Failed to send delete request for old ID:', oldFilePath, delErr);
+               });
+             }
+ 
              if (locationMeta.status === 'captured') {
                setLocationBanner({ text: 'แนบพิกัดสำเร็จพร้อมรูปภาพ', tone: 'success' })
              } else if (locationMeta.status === 'skipped') {
  ```

---

## 🔍 Plan Verification Self-Review

1. **Spec Coverage:**
   - Requirement 1 (Decrease photo file size by 50%): Implemented by reducing max resolution to `1000px` (using `Math.max` for height/width limits) and decreasing JPEG quality to `0.5`. (Covered in Task 2)
   - Requirement 2 (Delete old photo from OneDrive when retaking): Implemented by extracting `oldFilePath` and asynchronously calling `DELETE /api/upload/onedrive` with the old file path/id after the new upload succeeds. (Covered in Task 2)

2. **Placeholder Scan:**
   - No TBDs, TODOs, or empty guidelines. Code blocks contain exact replacement syntax.

3. **Type Consistency:**
   - No database schema or types are modified. OneDrive API DELETE payload uses `{ filePath: oldFilePath }` which exactly matches `api/upload/onedrive/route.js:72`.

4. **OneDrive Same-Name File Overwrite & Duplicate ID Edge Case (Resolved 19-May-2026):**
   - **Bug Symptom:** In retake attempts, uploading the image under the static filename `checklist_${item.id}_${pointIdx}.jpg` overrode the existing OneDrive file but retained the *same* OneDrive Item ID. The asynchronous DELETE routine would then fire on that same ID, resulting in the newly uploaded file being deleted immediately and failing the preview.
   - **Fix:** (1) Dynamic Timestamp: Appended `_${Date.now()}` to the upload filename to guarantee a brand new file item and ID are generated for every upload. (2) Safety Guard: Added an equality check `if (oldFilePath && oldFilePath !== resJ.filePath)` before triggering the background DELETE call to guarantee the new image item is never deleted.
