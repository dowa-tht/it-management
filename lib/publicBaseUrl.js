export function buildPublicBaseUrl() {
  const direct = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '')

  if (direct) return direct

  const vercelUrl = String(process.env.VERCEL_URL || '')
    .trim()
    .replace(/\/+$/, '')

  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
  }

  return 'http://localhost:3000'
}
