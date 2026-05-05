import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies })
  const { userId, pin } = await req.json()

  // Validate PIN (Must be 6 digits)
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ success: false, error: 'รหัส PIN ต้องเป็นตัวเลข 6 หลักเท่านั้น' }, { status: 400 })
  }

  // Hash the PIN
  const salt = await bcrypt.genSalt(10)
  const hashedPin = await bcrypt.hash(pin, salt)

  // Update user_profiles
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      signature_pin: hashedPin,
      pin_attempts: 0,
      pin_locked_until: null 
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
