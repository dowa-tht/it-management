
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// อ่าน API Key จาก .env.local
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
});

const resend = new Resend(env.RESEND_API_KEY);

async function testEmail() {
  const email = 'admin_dtt@dowa-tht.co.th';
  console.log(`--- Testing Email Sending to: ${email} ---`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'DOWA IT System <onboarding@resend.dev>',
      to: [email],
      subject: '[Test] DOWA IT Email Connection Test',
      html: '<h1>Connection Successful</h1><p>If you see this, your Resend API is working correctly.</p>'
    });

    if (error) {
      console.error('❌ Resend Error:', error);
      if (error.name === 'validation_error') {
        console.log('\n💡 Tip: Resend Free Tier requires you to verify your domain OR only send to your own registered email.');
      }
    } else {
      console.log('✅ Resend Success! ID:', data.id);
    }
  } catch (err) {
    console.error('💥 Unexpected Error:', err);
  }
}

testEmail();
