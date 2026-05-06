import './globals.css'
import { Noto_Sans_Thai, Noto_Sans } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { WorkingDateProvider } from '@/lib/context/WorkingDateContext'

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata = {
  title: 'DOWA IT System',
  description: 'IT Management System for DOWA THT Services',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${notoSans.variable}`}>
      <body>
        <WorkingDateProvider>
          {children}
        </WorkingDateProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}