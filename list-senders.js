require('dotenv').config();
const fetch = require('node-fetch');

async function listSenders() {
    const apiKey = process.env.SENDGRID_API_KEY;
    console.log("Fetching verified senders from SendGrid...");

    const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.ok) {
        const data = await response.json();
        console.log("Verified Senders Found:", JSON.stringify(data, null, 2));
    } else {
        const err = await response.json();
        console.error("❌ FAILURE: Could not fetch senders:", JSON.stringify(err, null, 2));
    }
}

listSenders();
