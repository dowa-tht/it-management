import { Resend } from 'resend';

/**
 * 📧 Unified Resend Email Service
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = 'DOWA IT System <noreply@dowa-tht.co.th>';

if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not defined in environment variables.');
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * ส่งอีเมลผ่าน Resend พร้อม Error Handling
 */
export async function sendEmail({ to, subject, html, from = DEFAULT_FROM, text }) {
  if (!resend) {
    console.error('❌ Resend is not initialized. Check RESEND_API_KEY.');
    return { error: 'Email service not configured' };
  }

  try {
    // มาตรฐานความสวยงาม: ห่อหุ้มด้วย Noto Sans Thai
    const wrappedHtml = `
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Noto Sans Thai', sans-serif; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Noto Sans Thai', sans-serif; -webkit-font-smoothing: antialiased;">
          ${html}
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: wrappedHtml,
      text,
    });

    if (error) {
      console.error('❌ Resend Send Error:', error);
      return { error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Unexpected Email Error:', err);
    return { error: err.message };
  }
}
