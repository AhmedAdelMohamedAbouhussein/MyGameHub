import express from 'express';
import { syncWithSteam, steamReturn } from '../controllers/sync/steamSync.js';
import { syncWithXbox, xboxReturn } from '../controllers/sync/xboxSync.js';
import { syncWithEpic, epicReturn } from '../controllers/sync/EpicSync.js';
import { PSNloginWithNpsso } from '../controllers/sync/PSNSync.js';
import { disconnectAccount } from '../controllers/sync/disconnectController.js';
import requireAuth from '../middleware/requireAuth.js';
import { syncLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Sync external game accounts (Steam, Xbox) with user account
 */

/**
 * @swagger
 * /sync:
 *   get:
 *     summary: Default endpoint for sync
 *     tags: [Sync]
 *     responses:
 *       404:
 *         description: Must specify what platform to sync
 */
router.get('/', (req, res) => {
    res.status(404).json({ error: 'specify what to sync' });
});

/**
 * @swagger
 * /sync/steam:
 *   get:
 *     summary: Initiate Steam authentication via OpenID
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Steam login initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Redirecting to Steam login"
 *       401:
 *         description: Steam login failed
 *       500:
 *         description: Server error
 */
router.get('/steam', requireAuth, syncLimiter, syncWithSteam);

/**
 * @swagger
 * /sync/steam/return:
 *   get:
 *     summary: Handle Steam OAuth callback and fetch owned games and achievements
 *     tags: [Sync]
 *     responses:
 *       302:
 *         description: Redirect to frontend library page after successful sync
 *       401:
 *         description: Steam login failed
 *       500:
 *         description: Failed to update Steam data
 */
router.get('/steam/return', requireAuth, steamReturn);

/**
 * @swagger
 * /sync/xbox:
 *   get:
 *     summary: Redirect user to Xbox/Microsoft login for account sync
 *     tags: [Sync]
 *     responses:
 *       302:
 *         description: Redirects to Microsoft login page
 */
router.get("/xbox", requireAuth, syncLimiter, syncWithXbox);

/**
 * @swagger
 * /sync/xbox/return:
 *   get:
 *     summary: Handle Xbox OAuth callback and fetch XSTS token
 *     tags: [Sync]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from Microsoft login
 *     responses:
 *       200:
 *         description: Xbox authentication completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xbox authentication complete! You can now call Xbox APIs."
 *       400:
 *         description: No code provided
 *       500:
 *         description: Xbox authentication failed
 */
router.get("/xbox/return", requireAuth, xboxReturn);

router.get("/epic", requireAuth, syncLimiter, syncWithEpic);

router.get("/epic/return", requireAuth, epicReturn);

router.post("/psn", requireAuth, syncLimiter, PSNloginWithNpsso);

router.delete('/:platform/:accountId', requireAuth, disconnectAccount);

export default router;