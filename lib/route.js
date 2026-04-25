import { NextResponse } from 'next/server'

export async function POST(request) {
  const { message } = await request.json()
  const token = process.env.LINE_NOTIFY_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 400 })
  }

  try {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message }),
    })

    if (res.ok) return NextResponse.json({ success: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}