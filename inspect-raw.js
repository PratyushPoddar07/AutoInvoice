require('dotenv').config();
const mongoose = require('mongoose');

async function inspectRaw() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const emailToSearch = "biswajitdash929@gmail.com";

        console.log(`\n--- Inspecting User Collection ---`);
        const user = await db.collection('users').findOne({ email: new RegExp(emailToSearch, 'i') });
        if (user) {
            console.log(`Found User email: "${user.email}" (Length: ${user.email.length})`);
            console.log(`Hex bytes: ${Buffer.from(user.email).toString('hex')}`);
        }

        console.log(`\n--- Inspecting OTP Collection ---`);
        const otp = await db.collection('otps').findOne({ email: new RegExp(emailToSearch, 'i') });
        if (otp) {
            console.log(`Found OTP email: "${otp.email}" (Length: ${otp.email.length})`);
            console.log(`Hex bytes: ${Buffer.from(otp.email).toString('hex')}`);
            console.log(`OTP Code: "${otp.otp}"`);
        }

        // Try exact match with trimmed vs untrimmed
        const exactMatch = await db.collection('otps').findOne({ email: emailToSearch });
        console.log(`\nExact match for "${emailToSearch}": ${exactMatch ? "YES" : "NO"}`);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

inspectRaw();
