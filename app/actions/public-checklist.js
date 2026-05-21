'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// Keep only safe fields for public display
const PUBLIC_TARGET_SELECT = 'id, target_code, target_type, name, location, metadata'

/**
 * Resolves a QR code value to either a Target or a specific Point.
 * Pattern: [TargetQR] or [TargetQR]#[PointID]
 * This is public and safe to use without authentication.
 */
export async function resolveChecklistQrPublic(qrCode) {
  noStore()
  if (!qrCode) return { success: false, error: 'กรุณาระบุรหัส QR' }

  try {
    const adminClient = getSupabaseAdmin()
    const rawQr = String(qrCode).trim()

    // Rate limit check or simple basic prevention here
    // In a real scenario we might check IP rate limits via redis etc

    // 1. Try exact match (Target Level)
    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select('id, target_code, name, is_active')
      .eq('qr_value', rawQr)
      .maybeSingle()

    if (target && target.is_active !== false) {
      // It's a target
      return {
        success: true,
        type: 'target',
        targetId: target.id,
        targetCode: target.target_code,
        targetName: target.name,
        redirectUrl: `/public/checklist/targets/${target.id}` // Might need generic target page later
      }
    }

    // 2. Try point-level match ([TargetQR]#[PointID])
    if (rawQr.includes('#')) {
      const [targetQr, pointId] = rawQr.split('#')
      const { data: pTarget } = await adminClient
        .from('checklist_targets')
        .select('id, target_code, name, is_active')
        .eq('qr_value', targetQr.trim())
        .maybeSingle()

      if (pTarget && pTarget.is_active !== false) {
        return {
          success: true,
          type: 'point',
          targetId: pTarget.id,
          pointId: pointId.trim(),
          targetCode: pTarget.target_code,
          targetName: pTarget.name,
          redirectUrl: `/public/checklist/targets/${pTarget.id}/points/${pointId.trim()}`
        }
      }
    }

    return {
      success: false,
      error: 'ไม่พบข้อมูลอุปกรณ์จาก QR นี้',
    }
  } catch (error) {
    return { success: false, error: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง' }
  }
}

function formatTargetPublic(record) {
  return {
    id: record.id,
    target_code: record.target_code || '',
    name: record.name || '',
    location: record.location || '',
  }
}

export async function getTargetPointHistoryPublic(targetId, pointId) {
  noStore()

  try {
    const adminClient = getSupabaseAdmin()

    // 1. Fetch Target (Public Safe)
    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select(PUBLIC_TARGET_SELECT)
      .eq('id', targetId)
      .eq('is_active', true)
      .maybeSingle()

    if (targetError || !target) {
      return { success: false, error: 'ไม่พบข้อมูลอุปกรณ์', history: [] }
    }

    // 2. Fetch Docs
    const { data: docs, error: docsError } = await adminClient
      .from('checklist_docs')
      .select('id, doc_no, period_date, status, checked_at')
      .eq('target_id', targetId)
      .order('period_date', { ascending: false })
      .limit(50) // Limit to prevent massive queries

    if (docsError) return { success: false, error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', history: [] }

    const docIds = (docs || []).map(d => d.id)
    if (docIds.length === 0) return { success: true, target: formatTargetPublic(target), history: [] }

    // 3. Fetch Items
    const { data: items, error: itemsError } = await adminClient
      .from('checklist_items')
      .select('id, doc_id, item_label, item_key, template_data')
      .in('doc_id', docIds)

    if (itemsError) return { success: false, error: 'เกิดข้อผิดพลาดในการโหลดรายละเอียด', history: [] }

    const history = []
    for (const doc of docs) {
      const docItems = items.filter(i => i.doc_id === doc.id)
      for (const item of docItems) {
        const td = item.template_data || {}
        const snapshot = td._snapshot || {}
        const type = snapshot.ui_template_type ?? 0

        // Only process photo templates
        if (type !== 1 && !item.item_key?.toLowerCase().includes('photo')) continue

        let photoUrl = null
        let meta = null
        let source = 'identity'

        // A. Try new structure first
        if (td.photos_by_point?.[pointId]) {
          photoUrl = td.photos_by_point[pointId]
          meta = td.photo_meta_by_point?.[pointId]
        }
        // B. Legacy fallback
        else if (td.photos || td.photo_meta) {
          const points = snapshot.config?.photo_points || []
          const pIdx = points.findIndex((p, idx) => {
            if (typeof p === 'object') return p.point_id === pointId || p.point_code === pointId
            // If string, check if P01, P02 matches idx
            return `P${(idx + 1).toString().padStart(2, '0')}` === pointId || p === pointId
          })

          if (pIdx !== -1) {
            photoUrl = td.photos?.[pIdx]
            meta = td.photo_meta?.[pIdx]
            source = 'legacy_mapping'
          }
        }

        if (photoUrl) {
          history.push({
            doc_id: doc.id,
            doc_no: doc.doc_no,
            period_date: doc.period_date,
            checked_at: doc.checked_at,
            status: doc.status,
            photo_url: photoUrl,
            meta: meta,
            source: source
          })
        }
      }
    }

    return {
      success: true,
      target: formatTargetPublic(target),
      point_id: pointId,
      history: history
    }
  } catch (error) {
    return { success: false, error: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง', history: [] }
  }
}


export async function getTargetHistoryPublic(targetId) {
  noStore()

  try {
    const adminClient = getSupabaseAdmin()

    // 1. Fetch Target (Public Safe)
    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select(PUBLIC_TARGET_SELECT)
      .eq('id', targetId)
      .eq('is_active', true)
      .maybeSingle()

    if (targetError || !target) {
      return { success: false, error: 'ไม่พบข้อมูลอุปกรณ์', history: [] }
    }

    // Fetch related templates for this target to group results by template frequency
    // (A target can be mapped directly or via target type)
    let templates = []
    try {
      const { data: targetMapping } = await adminClient
        .from('checklist_targets')
        .select('target_type')
        .eq('id', targetId)
        .single()

      const { data: templateMappings } = await adminClient
        .from('checklist_template_targets')
        .select('template_id')
        .or(`target_id.eq.${targetId},target_type.eq.${targetMapping?.target_type || '__no_target_type__'}`)

      const templateIds = (templateMappings || []).map(m => m.template_id)
      if (templateIds.length > 0) {
        const { data: t } = await adminClient
          .from('checklist_templates')
          .select('id, freq_type, item_label')
          .in('id', templateIds)
        templates = t || []
      }
    } catch {
      templates = []
    }

    // 2. Fetch Docs
    const { data: docs, error: docsError } = await adminClient
      .from('checklist_docs')
      .select('id, doc_no, period_date, status, checked_at, template_id')
      .eq('target_id', targetId)
      .order('period_date', { ascending: false })
      .limit(200) // Increase limit for calendar view

    if (docsError) {
      return {
        success: true,
        target: formatTargetPublic(target),
        templates,
        history: [],
        warning: 'ไม่สามารถโหลดประวัติย้อนหลังได้ในขณะนี้',
      }
    }

    return {
      success: true,
      target: formatTargetPublic(target),
      templates: templates,
      history: docs || []
    }
  } catch (error) {
    return { success: false, error: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง', history: [] }
  }
}
