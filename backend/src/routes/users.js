import express from 'express';
import { addUser } from '../controllers/users/create/addAndRestoreUsers.js';
import { getUserById, getUserIdByEmail, loginUser, getUserFriendList, getUserOwnedGames, getUserOwnedGame, getBatchUsers } from '../controllers/users/record/getUser.js';
import { softDeletUser, hardDeleteUser } from '../controllers/users/delete/softAndHardDeleteUser.js';
import { getPublicProfile, toggleLike, getCommunityUsers } from '../controllers/users/record/profileController.js';
import { toggleWishlist, getWishlist, checkWishlistStatus } from '../controllers/users/record/wishlistController.js';
import { setInitialPassword } from '../controllers/users/update/setInitialPassword.js';
import requireAuth from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRequest:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           example: "StrongPassword123"
 *  
 *     UserCreatedResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "User signed up successfully, verification OTP sent"
 *         userId:
 *           type: string
 *           example: "64ac2f9a2b4e3c0021234567"
 *
 *     UserResponse:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         publicID:
 *           type: string
 *           example: "JohnDoe#1234-ABCDE"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         bio:
 *           type: string
 *           example: "Gamer and developer"
 *         profileVisibility:
 *           type: string
 *           enum: ["public", "friends", "private"]
 *           example: "public"
 *         profilePicture:
 *           type: string
 *           example: "https://example.com/avatar.jpg"
 *         steamID:
 *           type: string
 *           example: "76561198000000000"
 *         xboxid:
 *           type: string
 *           example: "XBOX_USER_12345"
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           example: "StrongPassword123"
 *         rememberMe:
 *           type: boolean
 *           example: true
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Login successful redirecting to Landing Page......"
 *
 *     IdRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           example: "john@example.com"
 *
 *     UserIdResponse:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "64ac2f9a2b4e3c0021234567"
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "User deleted successfully"
 *
 *     OwnedGamesResponse:
 *       type: object
 *       properties:
 *         ownedGames:
 *           type: object
 *           additionalProperties:
 *             type: object
 *           example:
 *             Steam:
 *               12345:
 *                 title: "Hollow Knight"
 *                 playtime: 60
 *             Xbox:
 *               67890:
 *                 title: "Ori and the Blind Forest"
 *                 playtime: 20
 *
 *     FriendsResponse:
 *       type: object
 *       properties:
 *         friends:
 *           type: object
 *           example:
 *             Steam:
 *               - "Friend1#1234"
 *               - "Friend2#5678"
 *             Xbox:
 *               - "FriendA#9999"
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for managing users
 */

/**
 * @swagger
 * /api/users/adduser:
 *   post:
 *     summary: Add a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRequest'
 *     responses:
 *       201:
 *         description: User successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserCreatedResponse'
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists or associated with deleted account
 *       500:
 *         description: Server error
 */
router.post('/adduser', authLimiter, addUser);

/**
 * @swagger
 * /api/users/batch:
 *   post:
 *     summary: Get multiple users in a single query
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicIDs
 *             properties:
 *               publicIDs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["User1#123", "User2#456"]
 *     responses:
 *       200:
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid input array
 *       500:
 *         description: Server error
 */
router.post('/batch', getBatchUsers);

/**
 * @swagger
 * /api/users/{publicID}:
 *   get:
 *     summary: Get a user by publicID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: publicID
 *         required: true
 *         schema:
 *           type: string
 *         description: Public ID of the user
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:publicID', getUserById);

/**
 * @swagger
 * /api/users/getuseridbyemail:
 *   post:
 *     summary: Get user ID by email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IdRequest'
 *     responses:
 *       200:
 *         description: User ID found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserIdResponse'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.post('/getuseridbyemail', getUserIdByEmail);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       409:
 *         description: Account requires verification or is deleted
 *       404:
 *         description: Invalid email
 */
router.post('/login', authLimiter, loginUser);

/**
 * @swagger
 * /api/users/ownedgames:
 *   post:
 *     summary: Get all owned games for a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64ac2f9a2b4e3c0021234567"
 *     responses:
 *       200:
 *         description: List of owned games
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OwnedGamesResponse'
 *       404:
 *         description: User not found
 */
router.post('/ownedgames', requireAuth, getUserOwnedGames);

/**
 * @swagger
 * /api/users/ownedgames/{platform}/{id}:
 *   post:
 *     summary: Get a specific owned game
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *         description: Platform name (e.g., Steam, Xbox)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Game ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64ac2f9a2b4e3c0021234567"
 *     responses:
 *       200:
 *         description: Owned game found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 game:
 *                   type: object
 *                   example:
 *                     title: "Hollow Knight"
 *                     hoursPlayed: 55
 *                     platform: "Steam"
 *       404:
 *         description: Game or user not found
 */
router.post('/ownedgames/:platform/:id', requireAuth, getUserOwnedGame);

/**
 * @swagger
 * /api/users/friendlist:
 *   post:
 *     summary: Get a user's friend list
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicID:
 *                 type: string
 *                 example: "JohnDoe#1234-ABCDE"
 *     responses:
 *       200:
 *         description: Friend list returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FriendsResponse'
 *       404:
 *         description: User not found
 */
router.post('/friendlist', requireAuth, getUserFriendList);


/**
 * @swagger
 * /api/users/delete/soft:
 *   patch:
 *     summary: Soft delete a user (Deactivate)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 */
router.patch('/delete/soft', requireAuth, softDeletUser);

/**
 * @swagger
 * /api/users/delete/hard:
 *   delete:
 *     summary: Permanently delete a user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Account permanently deleted
 */
router.delete('/delete/hard', requireAuth, hardDeleteUser);

/**
 * @swagger
 * /api/users/community/all:
 *   get:
 *     summary: Get all public users (community directory)
 *     tags: [Users]
 */
router.get('/community/all', getCommunityUsers);

/**
 * @swagger
 * /api/users/profile/{publicID}:
 *   get:
 *     summary: Get a user's public profile and stats
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: publicID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile data returned
 *       404:
 *         description: User not found
 */
router.get('/profile/:publicID', getPublicProfile);

/**
 * @swagger
 * /api/users/profile/{publicID}/like:
 *   post:
 *     summary: Toggle like on a profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: publicID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 */
router.post('/profile/:publicID/like', requireAuth, toggleLike);

/**
 * @swagger
 * /api/users/wishlist/view:
 *   get:
 *     summary: Get user's wishlist with price tracking
 *     tags: [Users]
 */
router.get('/wishlist/view', requireAuth, getWishlist);

/**
 * @swagger
 * /api/users/wishlist/toggle:
 *   post:
 *     summary: Toggle add or remove a game from wishlist
 *     tags: [Users]
 */
router.post('/wishlist/toggle', requireAuth, toggleWishlist);

/**
 * @swagger
 * /api/users/wishlist/status/{gameId}:
 *   get:
 *     summary: Check if a game is in user's wishlist
 *     tags: [Users]
 */
router.get('/wishlist/status/:gameId', requireAuth, checkWishlistStatus);
router.post('/set-initial-password', requireAuth, setInitialPassword);

export default router;