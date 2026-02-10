require('dotenv').config();
const mongoose = require('mongoose');

// Define Schemas inline for the script
const UserSchema = new mongoose.Schema({
    id: String,
    email: String,
    isActive: Boolean,
    role: String
});

const OtpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    expiresAt: Date
});

async function diagnoseOtp() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);

        const email = "biswajitdash929@gmail.com";
        console.log(`\nChecking User: ${email}`);

        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            console.log("✅ User found:");
            console.log(JSON.stringify({
                id: user.id,
                email: user.email,
                isActive: user.isActive,
                role: user.role
            }, null, 2));
        } else {
            console.error("❌ User NOT found.");
        }

        console.log(`\nChecking OTPs for: ${email}`);
        const otps = await Otp.find({ email: email.toLowerCase() });
        if (otps.length > 0) {
            console.log(`✅ ${otps.length} OTP(s) found:`);
            otps.forEach(o => {
                console.log(`- Code: ${o.otp}, Expires: ${o.expiresAt}, Expired: ${o.expiresAt < new Date()}`);
            });
        } else {
            console.log("❌ No OTPs found for this email.");
        }

        // Check if there are ANY OTPs (maybe email mismatch?)
        const allOtps = await Otp.find({}).limit(5);
        console.log("\nSample of other OTPs in system:");
        allOtps.forEach(o => console.log(`- Email: ${o.email}, Code: ${o.otp}`));

    } catch (error) {
        console.error("Error during diagnosis:", error);
    } finally {
        await mongoose.connection.close();
    }
}

diagnoseOtp();
