process.env.RESEND_API_KEY = 're_GAtQQn2K_PWcm7CQffvqJmToBwzDtrQip';

async function test() {
  const { sendEmail } = await import('../lib/resend.js');
  const testEmail = process.argv[2] || 'it-support@dowa-tht.co.th';
  console.log(`🚀 Sending test email to: ${testEmail}`);
  
  const result = await sendEmail({
    to: testEmail,
    subject: '🔥 Resend Integration Test - DOWA IT System',
    html: `
      <h1>Resend Integration Test</h1>
      <p>This is a test email from the unified Resend service in DOWA IT System.</p>
      <p>Status: <b>Verified Domain Used</b></p>
      <p>Time: ${new Date().toLocaleString()}</p>
    `
  });

  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('Data:', result.data);
  } else {
    console.error('❌ Failed to send email.');
    console.error('Error:', result.error);
  }
}

test();
