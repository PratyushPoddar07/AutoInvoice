require('dotenv').config();
const fetch = require('node-fetch');

async function verifyEmailSend() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const companyName = process.env.COMPANY_NAME;

    console.log(`Verifying email delivery from: ${fromEmail}...`);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personalizations: [{
                to: [{ email: fromEmail }],
                subject: `Config Verification - ${companyName}`
            }],
            from: { email: fromEmail, name: companyName },
            content: [{
                type: 'text/plain',
                value: 'This is a test email to verify your new SendGrid API key configuration. End-to-end test passed!'
            }]
        })
    });

    if (response.ok) {
        console.log("✅ SUCCESS: Email sent successfully. The configuration is fully operational!");
    } else {
        const err = await response.json();
        console.error("❌ FAILURE: SendGrid returned error:", JSON.stringify(err, null, 2));
    }
}

verifyEmailSend();
