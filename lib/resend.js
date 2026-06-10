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
    const wrappedHtml = `
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#eef4ff; font-family:'Segoe UI', Tahoma, Arial, sans-serif; color:#0f172a;">
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

    // 📝 Audit Trail: บันทึก Log การส่งเมลลงฐานข้อมูล
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin')
      const supabaseAdmin = getSupabaseAdmin()
      await supabaseAdmin.from('email_logs').insert([{
        sender: from,
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        status: error ? 'failed' : 'sent',
        resend_id: data?.id || null,
        error_message: error ? JSON.stringify(error) : null,
        metadata: { source: 'Unified Resend Service' }
      }])
    } catch (logErr) {
      console.warn('⚠️ Failed to record email log:', logErr)
    }

    if (error) {
      console.error('❌ Resend Send Error:', error);
      return { error };
    }

    return { success: true, data };
  } catch (err) {
    // 📝 บันทึก Log กรณีเกิด Unexpected Error
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin')
      const supabaseAdmin = getSupabaseAdmin()
      await supabaseAdmin.from('email_logs').insert([{
        sender: from,
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        status: 'failed',
        error_message: err.message,
        metadata: { source: 'Unified Resend Service', type: 'unexpected' }
      }])
    } catch (logErr) {
      console.warn('⚠️ Failed to record unexpected email log:', logErr)
    }

    console.error('❌ Unexpected Email Error:', err);
    return { error: err.message };
  }
}
