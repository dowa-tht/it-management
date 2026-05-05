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
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
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
