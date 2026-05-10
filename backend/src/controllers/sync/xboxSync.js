import axios from 'axios';
import config from '../../config/env.js'
import userModel from "../../models/User.js";
import UserGame from "../../models/UserGame.js";
import Friendship from "../../models/Friendship.js";
import { uploadImageFromUrl } from "../../utils/imageUpload.js";
import logger from "../../utils/logger.js";
import { hashId } from '../../utils/logSanitize.js';


const APP_FRONTEND_URL = config.frontendUrl;

import { getXboxFriends, getXboxOwnedGames, enrichOwnedGamesWithAchievements } from '../allxboxinfo.js'

// Xbox config
const CLIENT_ID = config.azure.clientId;
const REDIRECT_URI = config.xboxRedirectURL;

const CLIENT_SECRET = config.azure.clientSecret;

export function syncWithXbox(req, res) {
    const authUrl = `https://login.live.com/oauth20_authorize.srf?` +
        new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: "code",
            redirect_uri: REDIRECT_URI,
            scope: "XboxLive.signin offline_access",
        });
    res.redirect(authUrl);
}


export async function xboxReturn(req, res) {
    const userId = req.session.userId;

    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided");

    try {
        // 1️⃣ Exchange code for Microsoft access + refresh tokens
        const tokenRes = await axios.post(
            "https://login.live.com/oauth20_token.srf",
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code,
                grant_type: "authorization_code",
                scope: "XboxLive.signin offline_access", // include offline_access for refresh token
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const msAccessToken = tokenRes.data.access_token;
        const msRefreshToken = tokenRes.data.refresh_token; // ← here’s your refresh token
        // Refresh token expiry: 60 days - 1 day
        const xboxTokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));

        // 2️⃣ Authenticate with Xbox Live
        const xblRes = await axios.post(
            "https://user.auth.xboxlive.com/user/authenticate",
            {
                RelyingParty: "http://auth.xboxlive.com",
                TokenType: "JWT",
                Properties: {
                    AuthMethod: "RPS",
                    SiteName: "user.auth.xboxlive.com",
                    RpsTicket: `d=${msAccessToken}`,
                },
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const xblToken = xblRes.data.Token;
        const userHash = xblRes.data.DisplayClaims.xui[0].uhs;

        // 3️⃣ Get XSTS token
        const xstsRes = await axios.post(
            "https://xsts.auth.xboxlive.com/xsts/authorize",
            {
                RelyingParty: "http://xboxlive.com",
                TokenType: "JWT",
                Properties: {
                    UserTokens: [xblToken],
                    SandboxId: "RETAIL",
                },
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const xstsToken = xstsRes.data.Token;

        // 4️⃣ Get Xbox profile (Gamertag)
        const profileRes = await axios.get(
            "https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,GameDisplayPicRaw,PublicGamerpic",
            {
                headers: {
                    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
                    "x-xbl-contract-version": "2",
                },
            }
        );

        const xuid = profileRes.data.profileUsers[0].id;

        const gamertag = profileRes.data.profileUsers[0].settings.find(s => s.id === "Gamertag")?.value;

        const freshAvatarUrl =
            profileRes.data.profileUsers[0].settings.find(s => s.id === "GameDisplayPicRaw")?.value ||
            profileRes.data.profileUsers[0].settings.find(s => s.id === "PublicGamerpic")?.value;

        // 1. Fetch User and Check for existing account
        const dbUser = await userModel.findById(userId);
        if (!dbUser) return res.status(404).json({ error: "User not found" });

        let linkedAccounts = dbUser.linkedAccounts || new Map();
        let xboxAccounts = linkedAccounts.get("Xbox") || [];

        const existingAccIndex = xboxAccounts.findIndex(acc => acc.accountId === xuid);
        const existingAcc = existingAccIndex > -1 ? xboxAccounts[existingAccIndex] : null;

        let avatar = existingAcc?.avatar;
        let originalAvatarUrl = existingAcc?.originalAvatarUrl;

        // Upload user's account avatar to Cloudinary ONLY if it changed
        if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
            const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `xbox_user_${xuid}`);
            if (result) {
                avatar = result.secure_url;
                originalAvatarUrl = freshAvatarUrl;
            }
        }

        const accountData = {
            accountId: xuid,
            displayName: gamertag,
            refreshToken: msRefreshToken,
            expiresAt: xboxTokenExpiresAt,
            lastSync: new Date(),
            avatar: avatar,
            originalAvatarUrl: originalAvatarUrl
        };

        if (existingAccIndex > -1) {
            xboxAccounts[existingAccIndex] = accountData;
        } else {
            xboxAccounts.push(accountData);
        }
        linkedAccounts.set("Xbox", xboxAccounts);
        dbUser.linkedAccounts = linkedAccounts;

        // 2. Parallelize API calls for maximum speed
        const [friendsList, noAchGames] = await Promise.all([
            getXboxFriends(xuid, userHash, xstsToken, existingAcc?.friends || []),
            getXboxOwnedGames(xuid, userHash, xstsToken)
        ]);

        // Achievements enrichment still depends on noAchGames
        const games = await enrichOwnedGamesWithAchievements(xuid, noAchGames, userHash, xstsToken);

        // 3. Fetch all existing games for this user/platform once
        const existingGames = await UserGame.find({ userId, platform: "Xbox" });
        const existingGamesMap = new Map(existingGames.map(g => [g.gameId, g]));

        // 4. Process Games in memory
        const gameBulkOps = [];
        for (const game of games) {
            if (!game || !game.gameId) continue;
            const gameId = String(game.gameId);

            const ownerRecord = {
                accountId: xuid,
                accountName: gamertag,
                hoursPlayed: game.hoursPlayed,
                lastPlayed: game.lastPlayed,
                progress: game.progress || 0,
                currentGamerscore: game.currentGamerscore || 0,
                maxGamerscore: game.maxGamerscore || 0,
                achievements: game.achievements || []
            };

            const existingGame = existingGamesMap.get(gameId);
            let updatedOwners = [];

            if (existingGame) {
                const ownerIndex = existingGame.owners.findIndex(o => o.accountId === xuid);
                updatedOwners = [...existingGame.owners];
                if (ownerIndex > -1) {
                    updatedOwners[ownerIndex] = ownerRecord;
                } else {
                    updatedOwners.push(ownerRecord);
                }
            } else {
                updatedOwners = [ownerRecord];
            }

            gameBulkOps.push({
                updateOne: {
                    filter: { userId, platform: "Xbox", gameId },
                    update: {
                        $set: {
                            gameName: game.gameName,
                            coverImage: game.coverImage,
                            totalHours: ownerRecord.hoursPlayed,
                            owners: updatedOwners,
                            maxProgress: Math.max(...updatedOwners.map(o => o.progress || 0))
                        },
                        $setOnInsert: { userId, platform: "Xbox", gameId }
                    },
                    upsert: true
                }
            });
        }

        // 5. Process Friends with Diff-based Sync
        const existingFriends = await Friendship.find({ userId, source: "Xbox", linkedAccountId: xuid });
        const existingFriendsMap = new Map(existingFriends.map(f => [f.externalId, f]));

        const friendBulkOps = [];
        const newFriendExternalIds = new Set();

        for (const f of friendsList) {
            newFriendExternalIds.add(f.externalId);
            const existing = existingFriendsMap.get(f.externalId);

            const friendDoc = {
                userId,
                friendUserPublicID: existing?.friendUserPublicID || null,
                externalId: f.externalId,
                linkedAccountId: xuid,
                displayName: f.displayName,
                profileUrl: f.profileUrl,
                friendsSince: f.friendsSince,
                avatar: f.avatar,
                originalAvatarUrl: f.originalAvatarUrl,
                status: "accepted",
                source: "Xbox",
                requestedByMe: false
            };

            if (!existing || existing.displayName !== f.displayName || existing.avatar !== f.avatar) {
                friendBulkOps.push({
                    updateOne: {
                        filter: { userId, source: "Xbox", externalId: f.externalId, linkedAccountId: xuid },
                        update: { $set: friendDoc },
                        upsert: true
                    }
                });
            }
        }

        const friendsToDelete = existingFriends
            .filter(f => !newFriendExternalIds.has(f.externalId))
            .map(f => f._id);

        if (friendsToDelete.length > 0) {
            friendBulkOps.push({
                deleteMany: { filter: { _id: { $in: friendsToDelete } } }
            });
        }

        // 6. Execute DB operations in parallel
        await Promise.all([
            gameBulkOps.length > 0 ? UserGame.bulkWrite(gameBulkOps, { ordered: false }) : Promise.resolve(),
            friendBulkOps.length > 0 ? Friendship.bulkWrite(friendBulkOps, { ordered: false }) : Promise.resolve()
        ]);

        await dbUser.save();

        res.redirect(`${APP_FRONTEND_URL}/library`)

    }
    catch (err) {
        logger.error({ 
            userId: hashId(userId), 
            message: err.message, 
            status: err.response?.status,
            details: err.response?.data 
        }, 'Xbox auth error');
        res.status(500).json({
            error: "Xbox authentication failed",
            details: err.response?.data || err.message,
        });
    }
}