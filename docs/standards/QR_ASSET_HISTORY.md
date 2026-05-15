# QR Asset History API Documentation

## Overview
The QR Asset History API provides a simple endpoint to resolve a QR code value to the corresponding target (asset) and retrieve its checklist history.

## Endpoint & Resolution Logic
```javascript
// resolveChecklistQr(qr_value) logic
```

1. **Asset Level:** If `qr_value` matches a `target_qr`, it redirects to `/dashboard/checklist/targets/[id]`.
2. **Point Level:** If `qr_value` contains `#`, e.g., `CCTV-001#P001`:
   - Prefix (`CCTV-001`) is resolved to a target.
   - Suffix (`P001`) is the `point_id`.
   - It redirects to `/dashboard/checklist/targets/[id]/points/[point_id]`.

## Data Schema for Point History
Points are tracked via:
- `photos_by_point`: Object mapping `point_id` to array of URLs.
- `photo_meta_by_point`: Object mapping `point_id` to metadata array (GPS, timestamp).

## Legacy Fallback
If point-specific data is missing, the system scans `photo_meta` for matching `label` or `code` to reconstruct history for that point.

## Example Usage (cURL)
```bash
curl "https://your-domain.com/api/qr/lookup?qr_value=ABC123XYZ"
```

## Integration Notes
- The endpoint uses the Supabase admin client, so it must be called from server‑side code or a trusted environment.
- Ensure the `qr_value` column is indexed (see migration script) for fast lookups.
- The returned `target` object can be used to fetch related checklist documents via the `target_id` field.

---
*Last updated: 2026‑05‑14*