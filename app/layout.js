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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const originalError = console.error;
            console.error = function(...args) {
              const msg = args.map(a => {
                if (a && a.message) return a.message;
                return String(a);
              }).join(' ');
              if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
                try {
                  const keysToRemove = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                      keysToRemove.push(key);
                    }
                  }
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                  document.cookie.split(";").forEach(function(c) {
                    const name = c.split("=")[0].trim();
                    if (name.startsWith("sb-") || name.includes("auth-token") || name.includes("supabase")) {
                      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }
                  });
                  window.location.href = '/';
                } catch (e) {
                  originalError.apply(console, args);
                }
                return;
              }
              originalError.apply(console, args);
            };
          })();
        `}} />
      </head>
      <body className="">
        <WorkingDateProvider>
          {children}
        </WorkingDateProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}