import './globals.css'
import { Noto_Sans_Thai, Noto_Sans } from 'next/font/google'

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DOWA IT System',
  description: 'IT Management System',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}