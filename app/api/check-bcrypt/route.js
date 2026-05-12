import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const isValid = bcrypt.compareSync('123456', '$2b$10$WHobtQ18CppKrvo8onjdLuBWia8jWPYWTt7XOtPaSthjAuaysptEW')
  return NextResponse.json({ isValid })
}
