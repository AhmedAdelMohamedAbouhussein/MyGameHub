import express from 'express';

import { sendOtp } from '../controllers/nodeMailer/sendOtp.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { verifyOtp } from '../controllers/nodeMailer/verifyOtp.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: API for sending and verifying OTPs for email verification, password reset, account restore, and permanent deletion
 */

/**
 * @swagger
 * /api/mail/sendotp:
 *   post:
 *     summary: Send OTP to a user for a specific purpose
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ID of the user
 *               email:
 *                 type: string
 *                 description: Email of the user
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, restore_account, permanently_delete_account, deactivate_account]
 *                 description: Purpose of the OTP
 *             required:
 *               - userId
 *               - email
 *               - purpose
 *             example:
 *               userId: "64f123abc456..."
 *               email: "user@example.com"
 *               purpose: "email_verification"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "verification email sent successfully, OTP will expire in 10 min"
 *       400:
 *         description: Missing body parameters or invalid purpose
 *       404:
 *         description: User not found
 *       429:
 *         description: Maximum OTP resend attempts reached
 */
router.post('/sendotp', authLimiter, sendOtp);

/**
 * @swagger
 * /api/mail/verifyOtp:
 *   post:
 *     summary: Verify OTP for a specific purpose
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ID of the user
 *               otp:
 *                 type: string
 *                 description: OTP code sent to the user
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, restore_account, permanently_delete_account, deactivate_account]
 *                 description: Purpose of the OTP
 *             required:
 *               - userId
 *               - otp
 *               - purpose
 *             example:
 *               userId: "64f123abc456..."
 *               otp: "123456"
 *               purpose: "email_verification"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully, redirecting to Landing Page......"
 *                 userId:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 resetToken:
 *                   type: string
 *                   description: Only returned for password reset
 *       400:
 *         description: Missing parameters, OTP expired, or invalid purpose
 *       401:
 *         description: Invalid OTP
 *       429:
 *         description: Too many failed OTP attempts
 */
router.post('/verifyOtp', authLimiter, verifyOtp);

export default router;