/**
 * One-time script: send email_verification OTP to all unverified users.
 *
 * Run from backend root:
 *   node src/scripts/resendVerificationEmails.js
 *
 * It reuses the same sendOtpToUser() function the app uses, so the OTP is
 * stored in the DB and hashed exactly the same way.
 */

import mongoose from 'mongoose';
import config from '../config/env.js';
import User from '../models/User.js';
import { sendOtpToUser } from '../controllers/nodeMailer/sendOtp.js';

// ── tiny helper ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── connect ──────────────────────────────────────────────────────────────────
await mongoose.connect(config.mongoUri);
console.log('✅ Connected to MongoDB');

// ── find all unverified, non-deleted users ───────────────────────────────────
const users = await User.find(
    { isVerified: false, isDeleted: false },
    // resendCount fields are select:false — explicitly include them
    '+resendCount.emailVerification.count +resendCount.emailVerification.lastReset'
);

// ── also force-include the extra address if not already in the list ──────────
const EXTRA_EMAIL = 'aa5913372@gmail.com';
const extraAlreadyIncluded = users.some(
    (u) => u.email.toLowerCase() === EXTRA_EMAIL.toLowerCase()
);

if (!extraAlreadyIncluded) {
    const extraUser = await User.findOne(
        { email: EXTRA_EMAIL },
        '+resendCount.emailVerification.count +resendCount.emailVerification.lastReset'
    );
    if (extraUser) {
        users.push(extraUser);
        console.log(`ℹ️  Extra user found and added: ${EXTRA_EMAIL}`);
    } else {
        console.warn(`⚠️  Extra email not found in DB: ${EXTRA_EMAIL}`);
    }
}

console.log(`📬 Sending verification emails to ${users.length} user(s)...\n`);

let sent = 0;
let failed = 0;

for (const user of users) {
    try {
        await sendOtpToUser({
            userId: user._id,
            email: user.email,
            purpose: 'email_verification',
            userName: user.name,
        });
        console.log(`  ✅  ${user.email}`);
        sent++;
    } catch (err) {
        console.error(`  ❌  ${user.email} — ${err.message}`);
        failed++;
    }

    // 300ms gap between sends — polite to Resend / Gmail rate limits
    await sleep(300);
}

console.log(`\n🏁 Done — ${sent} sent, ${failed} failed.`);

await mongoose.disconnect();
process.exit(0);
