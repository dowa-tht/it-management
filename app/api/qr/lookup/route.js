'use server'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin.js'

/**
 * API route to resolve a QR value to a target ID.
 * Expects query param `qr_value`.
 * Returns `{ success: true, target: { id, target_code, name, ... } }`
 * or `{ success: false, error: '...' }`.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const qrValue = String(searchParams.get('qr_value') || '').trim()

  if (!qrValue) {
    return NextResponse.json({ success: false, error: 'qr_value is required' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('checklist_targets')
      .select('id, target_code, target_type, name, location, qr_value, metadata, is_active, created_at, updated_at')
      .eq('qr_value', qrValue)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Target not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, target: data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || 'Unexpected server error' }, { status: 500 })
  }
}
