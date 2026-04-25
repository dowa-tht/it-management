import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DOWA IT System',
  description: 'IT Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}