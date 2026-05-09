import express from 'express';
import { body, validationResult } from 'express-validator';
import { googleLogin, googleSignup } from '../controllers/Auth/googleAuthController.js';
import { authUser } from '../controllers/Auth/authUser.js'
import { logoutUser } from '../controllers/Auth/logoutUser.js'
import { resetPassword } from '../controllers/Auth/resetPassword.js'

import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ── Validation middleware ─────────────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ── Validation chains ─────────────────────────────────────────────────────────
const loginValidation = [
    body('code')
        .trim()
        .notEmpty().withMessage('Google OAuth code is required'),
    body('rememberMe')
        .optional()
        .isBoolean().withMessage('rememberMe must be a boolean'),
];

const signupValidation = [
    body('code')
        .trim()
        .notEmpty().withMessage('Google OAuth code is required'),
];

const resetPasswordValidation = [
    body('userId')
        .trim()
        .notEmpty().withMessage('userId is required')
        .isMongoId().withMessage('userId must be a valid MongoDB ObjectId'),
    body('token')
        .trim()
        .notEmpty().withMessage('Reset token is required'),
    body('newPassword')
        .trim()
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/google/login:
 *   post:
 *     summary: Login user via Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "4/0AX4XfWh..."
 *               rememberMe:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful redirecting to Landing Page......"
 *       400:
 *         description: Validation error — missing or invalid fields
 *       404:
 *         description: Invalid email or user not found
 *       409:
 *         description: Email associated with deleted account
 */

router.post('/google/login', authLimiter, loginValidation, validate, googleLogin);

/**
 * @swagger
 * /api/auth/google/signup:
 *   post:
 *     summary: Signup user via Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "4/0AX4XfWh..."
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error — missing or invalid fields
 *       409:
 *         description: Email already exists or deleted
 */
router.post('/google/signup', authLimiter, signupValidation, validate, googleSignup);

/**
 * @swagger
 * /api/auth/authUser:
 *   get:
 *     summary: Get currently logged in user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
router.get('/authUser', authUser)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /api/auth/resetpassword:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     description: Use a valid reset token to update the user's password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *               - newPassword
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64ac2f9a2b4e3c0021234567"
 *               token:
 *                 type: string
 *                 example: "abc123resetTokenExample"
 *               newPassword:
 *                 type: string
 *                 example: "NewStrongPassword1"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successful."
 *       400:
 *         description: Validation error or invalid/expired token
 *       404:
 *         description: User not found or inactive
 *       500:
 *         description: Server error
 */
router.post('/resetpassword', resetPasswordValidation, validate, resetPassword)

export default router;