'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getCurrentUserSession } from './user'

const TARGET_SELECT = 'id, target_code, target_type, name, location, qr_value, metadata, is_active, created_at, updated_at'

function buildAssetHistoryPhotoList(items) {
  const photos = []

  for (const item of items || []) {
    const templateData = item?.template_data && typeof item.template_data === 'object' ? item.template_data : {}
    const snapshot = templateData._snapshot && typeof templateData._snapshot === 'object' ? templateData._snapshot : {}

    const candidateLists = [
      Array.isArray(templateData.photos) ? templateData.photos : [],
      Array.isArray(snapshot.photos) ? snapshot.photos : [],
    ]

    for (const list of candidateLists) {
      for (const value of list) {
        if (typeof value === 'string' && value.trim()) {
          photos.push({
            url: value,
            item_label: item.item_label || item.item_key || 'Photo evidence',
            item_id: item.id,
          })
        }
      }
    }
  }

  return photos
}

function formatAssetHistoryDoc(doc, items) {
  const safeItems = Array.isArray(items) ? items : []

  return {
    id: doc.id,
    doc_no: doc.doc_no || '',
    freq_type: doc.freq_type || '',
    period_date: doc.period_date || null,
    status: doc.status || '',
    created_at: doc.created_at || null,
    checked_at: doc.checked_at || null,
    items: safeItems,
    photo_count: buildAssetHistoryPhotoList(safeItems).length,
    photos: buildAssetHistoryPhotoList(safeItems),
  }
}

export async function getTargetAssetHistory(targetId) {
  noStore()

  const normalizedTargetId = String(targetId || '').trim()
  if (!normalizedTargetId) {
    return {
      success: false,
      error: 'Target ID is required',
      target: null,
      docs: [],
    }
  }

  try {
    const { adminClient } = await requireAdminProfile()

    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select(TARGET_SELECT)
      .eq('id', normalizedTargetId)
      .maybeSingle()

    if (targetError) {
      return {
        success: false,
        error: targetError.message,
        target: null,
        docs: [],
      }
    }

    if (!target) {
      return {
        success: false,
        error: 'ไม่พบข้อมูลอุปกรณ์',
        target: null,
        docs: [],
      }
    }

    const { data: docs, error: docsError } = await adminClient
      .from('checklist_docs')
      .select('id, doc_no, freq_type, period_date, status, created_at, checked_at')
      .eq('target_id', normalizedTargetId)
      .order('period_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (docsError) {
      return {
        success: false,
        error: docsError.message,
        target: formatTarget(target),
        docs: [],
      }
    }

    const docIds = (docs || []).map((doc) => doc.id).filter(Boolean)
    let itemsByDocId = new Map()

    if (docIds.length > 0) {
      const { data: allItems, error: itemsError } = await adminClient
        .from('checklist_items')
        .select('id, doc_id, item_key, item_label, status, checked_at, template_data, target_snapshot, evidence_summary')
        .in('doc_id', docIds)
        .order('checked_at', { ascending: false })

      if (itemsError) {
        return {
          success: false,
          error: itemsError.message,
          target: formatTarget(target),
          docs: [],
        }
      }

      itemsByDocId = (allItems || []).reduce((map, item) => {
        const existing = map.get(item.doc_id) || []
        existing.push(item)
        map.set(item.doc_id, existing)
        return map
      }, new Map())
    }

    return {
      success: true,
      error: null,
      target: formatTarget(target),
      docs: (docs || []).map((doc) => formatAssetHistoryDoc(doc, itemsByDocId.get(doc.id) || [])),
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      target: null,
      docs: [],
    }
  }
}

export async function getTargetPointHistory(targetId, pointId) {
  noStore()

  try {
    const { adminClient } = await requireAdminProfile()

    // 1. Fetch Target
    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select(TARGET_SELECT)
      .eq('id', targetId)
      .maybeSingle()

    if (targetError || !target) {
      return { success: false, error: targetError?.message || 'ไม่พบข้อมูลอุปกรณ์', history: [] }
    }

    // 2. Fetch Docs
    const { data: docs, error: docsError } = await adminClient
      .from('checklist_docs')
      .select('id, doc_no, period_date, status, checked_at')
      .eq('target_id', targetId)
      .order('period_date', { ascending: false })

    if (docsError) return { success: false, error: docsError.message, history: [] }

    const docIds = (docs || []).map(d => d.id)
    if (docIds.length === 0) return { success: true, target: formatTarget(target), history: [] }

    // 3. Fetch Items
    const { data: items, error: itemsError } = await adminClient
      .from('checklist_items')
      .select('id, doc_id, item_label, item_key, template_data')
      .in('doc_id', docIds)

    if (itemsError) return { success: false, error: itemsError.message, history: [] }

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
            photo_url: photoUrl,
            meta: meta,
            source: source
          })
        }
      }
    }

    return {
      success: true,
      target: formatTarget(target),
      point_id: pointId,
      history: history
    }
  } catch (error) {
    return { success: false, error: error.message, history: [] }
  }
}

/**
 * Resolves a QR code value to either a Target or a specific Point.
 * Pattern: [TargetQR] or [TargetQR]#[PointID]
 */
export async function resolveChecklistQr(qrCode) {
  noStore()
  if (!qrCode) return { success: false, error: 'กรุณาระบุรหัส QR' }

  try {
    const { adminClient } = await requireAdminProfile()
    const rawQr = String(qrCode).trim()
    
    // 1. Try exact match (Target Level)
    const { data: target, error: targetError } = await adminClient
      .from('checklist_targets')
      .select(TARGET_SELECT)
      .eq('qr_value', rawQr)
      .maybeSingle()

    if (target) {
      return {
        success: true,
        type: 'target',
        targetId: target.id,
        targetCode: target.target_code,
        targetName: target.name,
        redirectUrl: `/dashboard/checklist/targets/${target.id}`
      }
    }

    // 2. Try point-level match ([TargetQR]#[PointID])
    if (rawQr.includes('#')) {
      const [targetQr, pointId] = rawQr.split('#')
      const { data: pTarget } = await adminClient
        .from('checklist_targets')
        .select('id, target_code, name')
        .eq('qr_value', targetQr.trim())
        .maybeSingle()

      if (pTarget) {
        return {
          success: true,
          type: 'point',
          targetId: pTarget.id,
          pointId: pointId.trim(),
          targetCode: pTarget.target_code,
          targetName: pTarget.name,
          redirectUrl: `/dashboard/checklist/targets/${pTarget.id}/points/${pointId.trim()}`
        }
      }
    }

    return {
      success: false,
      error: 'ไม่พบข้อมูลอุปกรณ์จาก QR นี้',
      debug: { rawQr }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function requireAdminProfile() {
  const session = await getCurrentUserSession()

  if (!session || session.type !== 'internal') {
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน')
  }

  const adminClient = getSupabaseAdmin()
  const { data: profile, error } = await adminClient
    .from('user_profiles')
    .select('id, role, is_active, full_name')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')
  }

  if (!profile.is_active || profile.role !== 'admin') {
    throw new Error('คุณไม่มีสิทธิ์จัดการ Target Registry')
  }

  return { session, profile, adminClient }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeMetadata(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(String(value))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function buildQrValue(targetType, targetCode, qrValue) {
  const explicitValue = normalizeText(qrValue)
  if (explicitValue) return explicitValue

  const safeType = normalizeText(targetType).toUpperCase().replace(/[^A-Z0-9]+/g, '-') || 'TARGET'
  const safeCode = normalizeText(targetCode).toUpperCase().replace(/[^A-Z0-9]+/g, '-') || Date.now()
  return `${safeType}-${safeCode}`
}

function validateTargetPayload(payload) {
  const target = {
    id: payload?.id || null,
    target_code: normalizeText(payload?.target_code),
    target_type: normalizeText(payload?.target_type),
    name: normalizeText(payload?.name),
    location: normalizeText(payload?.location),
    qr_value: buildQrValue(payload?.target_type, payload?.target_code, payload?.qr_value),
    metadata: normalizeMetadata(payload?.metadata),
    is_active: payload?.is_active !== false,
  }

  const fieldErrors = {}
  if (!target.target_code) fieldErrors.target_code = 'กรุณาระบุรหัส Target'
  if (!target.target_type) fieldErrors.target_type = 'กรุณาระบุชนิด Target'
  if (!target.name) fieldErrors.name = 'กรุณาระบุชื่อ Target'
  if (!target.qr_value) fieldErrors.qr_value = 'กรุณาระบุ QR Value'

  return {
    success: Object.keys(fieldErrors).length === 0,
    data: target,
    fieldErrors,
  }
}

function formatTarget(record) {
  return {
    id: record.id,
    target_code: record.target_code || '',
    target_type: record.target_type || '',
    name: record.name || '',
    location: record.location || '',
    qr_value: record.qr_value || '',
    metadata: record.metadata || {},
    is_active: record.is_active !== false,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }
}

export async function getTargetRegistryPageData() {
  noStore()

  const { profile, adminClient } = await requireAdminProfile()

  const [targetsResult, templatesResult, targetTypesResult] = await Promise.all([
    adminClient
      .from('checklist_targets')
      .select(TARGET_SELECT)
      .order('target_type')
      .order('target_code'),
    adminClient
      .from('checklist_template_targets')
      .select('id, template_id, target_id, target_type, is_active')
      .eq('is_active', true),
    adminClient
      .from('master_data')
      .select('id, value')
      .eq('type', 'target_type')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (targetsResult.error) throw new Error(targetsResult.error.message)
  if (templatesResult.error) throw new Error(templatesResult.error.message)
  if (targetTypesResult.error) throw new Error(targetTypesResult.error.message)

  return {
    currentUser: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
    },
    targets: (targetsResult.data || []).map(formatTarget),
    mappings: templatesResult.data || [],
    targetTypes: (targetTypesResult.data || []).map(t => t.value),
  }
}

export async function saveChecklistTarget(payload) {
  try {
    const { adminClient } = await requireAdminProfile()
    const validation = validateTargetPayload(payload)

    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validation.fieldErrors,
      }
    }

    const target = validation.data
    const existingId = target.id || null
    const duplicateQuery = adminClient
      .from('checklist_targets')
      .select('id')
      .eq('qr_value', target.qr_value)

    const { data: duplicate, error: duplicateError } = existingId
      ? await duplicateQuery.neq('id', existingId).maybeSingle()
      : await duplicateQuery.maybeSingle()

    if (duplicateError) {
      return { success: false, error: duplicateError.message }
    }

    if (duplicate) {
      return {
        success: false,
        error: 'QR Value นี้ถูกใช้งานแล้ว',
        fieldErrors: { qr_value: 'QR Value นี้ถูกใช้งานแล้ว' },
      }
    }

    const dataToSave = {
      target_code: target.target_code,
      target_type: target.target_type,
      name: target.name,
      location: target.location || null,
      qr_value: target.qr_value,
      metadata: target.metadata,
      is_active: target.is_active,
      updated_at: new Date().toISOString(),
    }

    const query = existingId
      ? adminClient.from('checklist_targets').update(dataToSave).eq('id', existingId).select(TARGET_SELECT).single()
      : adminClient.from('checklist_targets').insert([dataToSave]).select(TARGET_SELECT).single()

    const { data, error } = await query
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/settings/target-registry')

    return {
      success: true,
      target: formatTarget(data),
      message: existingId ? 'บันทึก Target สำเร็จ' : 'สร้าง Target สำเร็จ',
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteChecklistTarget(targetId) {
  try {
    const { adminClient } = await requireAdminProfile()

    // 1. Check if the target is referenced in checklist_docs
    const { count, error: countErr } = await adminClient
      .from('checklist_docs')
      .select('id', { count: 'exact', head: true })
      .eq('target_id', targetId)

    if (countErr) {
      return { success: false, error: countErr.message }
    }

    if (count && count > 0) {
      return {
        success: false,
        error: 'ไม่สามารถลบอุปกรณ์นี้ได้ เนื่องจากมีประวัติการตรวจบันทึกไว้ในระบบแล้ว กรุณาตั้งค่าเป็นไม่ใช้งาน (Deactivate) แทนเพื่อความปลอดภัยของข้อมูล',
      }
    }

    // 2. Delete mappings first
    const { error: deleteMappingsErr } = await adminClient
      .from('checklist_template_targets')
      .delete()
      .eq('target_id', targetId)

    if (deleteMappingsErr) {
      return { success: false, error: deleteMappingsErr.message }
    }

    // 3. Delete the target itself
    const { error: deleteTargetErr } = await adminClient
      .from('checklist_targets')
      .delete()
      .eq('id', targetId)

    if (deleteTargetErr) {
      return { success: false, error: deleteTargetErr.message }
    }

    revalidatePath('/dashboard/settings/target-registry')
    return { success: true, message: 'ลบอุปกรณ์เรียบร้อยแล้ว' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function addTargetType(value) {
  try {
    const { adminClient } = await requireAdminProfile()
    const cleanValue = String(value || '').trim()

    if (!cleanValue) {
      return { success: false, error: 'กรุณาระบุประเภทอุปกรณ์' }
    }

    // Check duplicate
    const { data: existing, error: existErr } = await adminClient
      .from('master_data')
      .select('id')
      .eq('type', 'target_type')
      .ilike('value', cleanValue)
      .maybeSingle()

    if (existErr) {
      return { success: false, error: existErr.message }
    }

    if (existing) {
      return { success: false, error: 'ประเภทอุปกรณ์นี้มีอยู่แล้วในระบบ' }
    }

    // Get max sort order
    const { data: maxObj } = await adminClient
      .from('master_data')
      .select('sort_order')
      .eq('type', 'target_type')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (maxObj?.sort_order || 0) + 1

    const { error: insertErr } = await adminClient
      .from('master_data')
      .insert([
        {
          type: 'target_type',
          value: cleanValue,
          sort_order: sortOrder,
          is_active: true,
        },
      ])

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    revalidatePath('/dashboard/settings/target-registry')
    return { success: true, message: 'เพิ่มประเภทอุปกรณ์สำเร็จ' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteTargetType(value) {
  try {
    const { adminClient } = await requireAdminProfile()
    const cleanValue = String(value || '').trim()

    if (!cleanValue) {
      return { success: false, error: 'กรุณาระบุประเภทอุปกรณ์' }
    }

    // 1. Check if used by targets
    const { count: targetCount, error: targetCountErr } = await adminClient
      .from('checklist_targets')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', cleanValue)

    if (targetCountErr) {
      return { success: false, error: targetCountErr.message }
    }

    // 2. Check if used by templates (scope_mode = 'per_type')
    const { count: templateCount, error: templateCountErr } = await adminClient
      .from('checklist_templates')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', cleanValue)

    if (templateCountErr) {
      return { success: false, error: templateCountErr.message }
    }

    if ((targetCount && targetCount > 0) || (templateCount && templateCount > 0)) {
      return {
        success: false,
        error: 'ไม่สามารถลบได้ เนื่องจากประเภทอุปกรณ์นี้กำลังถูกใช้งานโดยอุปกรณ์หรือเทมเพลตในระบบ',
      }
    }

    // 3. Delete from master_data
    const { error: deleteErr } = await adminClient
      .from('master_data')
      .delete()
      .eq('type', 'target_type')
      .eq('value', cleanValue)

    if (deleteErr) {
      return { success: false, error: deleteErr.message }
    }

    revalidatePath('/dashboard/settings/target-registry')
    return { success: true, message: 'ลบประเภทอุปกรณ์สำเร็จ' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
