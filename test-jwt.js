const { SignJWT } = require('jose');
const mongoose = require('mongoose');

const secret = new TextEncoder().encode('test-secret-at-least-32-chars-long');

async function testEncryption() {
    try {
        // Mock a mongoose-like object
        const mockUser = {
            id: '123',
            email: 'test@example.com',
            toObject: () => ({ id: '123', email: 'test@example.com' })
        };
        // Add some typical mongoose hidden properties that might cause issues
        Object.defineProperty(mockUser, '$__', { value: {}, enumerable: false });

        console.log("Testing with plain object...");
        await new SignJWT({ user: mockUser.toObject() }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
        console.log("✅ Plain object works.");

        console.log("\nTesting with complex object (simulating Mongoose doc)...");
        try {
            // jose SignJWT actually handles most objects, BUT if it has getter/setters or 
            // the data is too large, or if it has circular refs, it fails.
            // Let's see if a real SignJWT call fails with a simple object that has hidden props.
            await new SignJWT({ user: mockUser }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
            console.log("✅ Complex object worked (surprisingly).");
        } catch (e) {
            console.error("❌ Complex object failed:", e.message);
        }

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

testEncryption();
