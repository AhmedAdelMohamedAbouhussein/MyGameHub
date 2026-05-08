import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode, getProfileFromUserName } from "psn-api";
import { getAllOwnedGames, getFriendList } from "../allPSNInfo.js";
import userModel from "../../models/User.js";
import UserGame from "../../models/UserGame.js";
import Friendship from "../../models/Friendship.js";
import { uploadImageFromUrl } from "../../utils/imageUpload.js";
import logger from "../../utils/logger.js";
import { hashId } from "../../utils/logSanitize.js";

export const PSNloginWithNpsso = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ error: "User not authenticated" });

        const { npsso } = req.body;
        if (!npsso) return res.status(400).json({ error: "NPSSO missing" });

        // Exchange NPSSO for access code
        const accessCode = await exchangeNpssoForAccessCode(npsso);
        const authorization = await exchangeAccessCodeForAuthTokens(accessCode);

        const PSNRefreshToken = authorization.refreshToken;
        const PSNTokenExpiresAt = new Date(Date.now() + (authorization.refreshTokenExpiresIn * 1000) - (24 * 60 * 60 * 1000));

        const profileResponse = await getProfileFromUserName(authorization, "me");
        const PSNId = profileResponse.profile.onlineId;
        const freshAvatarUrl = profileResponse.profile.avatarUrls[0].avatarUrl;

        // 1. Fetch User and Check for existing account
        const dbUser = await userModel.findById(userId);
        if (!dbUser) return res.status(404).json({ error: "User not found" });

        let linkedAccounts = dbUser.linkedAccounts || new Map();
        let psnAccounts = linkedAccounts.get("PSN") || [];
        const existingAccIndex = psnAccounts.findIndex(acc => acc.accountId === PSNId);
        const existingAcc = existingAccIndex > -1 ? psnAccounts[existingAccIndex] : null;

        let avatar = existingAcc?.avatar;
        let originalAvatarUrl = existingAcc?.originalAvatarUrl;

        // Upload user's account avatar to Cloudinary ONLY if it changed
        if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
            const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `psn_user_${PSNId}`);
            if (result) {
                avatar = result.secure_url;
                originalAvatarUrl = freshAvatarUrl;
            }
        }

        const accountData = {
            accountId: PSNId,
            displayName: PSNId,
            refreshToken: PSNRefreshToken,
            expiresAt: PSNTokenExpiresAt,
            lastSync: new Date(),
            avatar: avatar,
            originalAvatarUrl: originalAvatarUrl
        };

        if (existingAccIndex > -1) {
            psnAccounts[existingAccIndex] = accountData;
        } else {
            psnAccounts.push(accountData);
        }
        linkedAccounts.set("PSN", psnAccounts);
        dbUser.linkedAccounts = linkedAccounts;

        // 2. Parallelize API calls for maximum speed
        const [friendsList, games] = await Promise.all([
            getFriendList(authorization, existingAcc?.friends || []),
            getAllOwnedGames(authorization)
        ]);
        
        // 3. Fetch all existing games for this user/platform once
        const existingGames = await UserGame.find({ userId, platform: "PSN" });
        const existingGamesMap = new Map(existingGames.map(g => [g.gameId, g]));

        // 4. Process Games in memory
        const gameBulkOps = [];
        for (const game of games) {
            if (!game || !game.gameId) continue;
            const gameId = String(game.gameId);
            
            const ownerRecord = {
                accountId: PSNId,
                accountName: PSNId,
                hoursPlayed: game.hoursPlayed,
                lastPlayed: game.lastPlayed,
                progress: game.progress || 0,
                currentGamerscore: 0,
                maxGamerscore: 0,
                achievements: game.achievements || []
            };

            const existingGame = existingGamesMap.get(gameId);
            let updatedOwners = [];
            
            if (existingGame) {
                const ownerIndex = existingGame.owners.findIndex(o => o.accountId === PSNId);
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
                    filter: { userId, platform: "PSN", gameId },
                    update: {
                        $set: {
                            gameName: game.gameName,
                            coverImage: game.coverImage,
                            totalHours: ownerRecord.hoursPlayed,
                            owners: updatedOwners,
                            maxProgress: Math.max(...updatedOwners.map(o => o.progress || 0))
                        },
                        $setOnInsert: { userId, platform: "PSN", gameId }
                    },
                    upsert: true
                }
            });
        }

        // 5. Process Friends with Diff-based Sync
        const existingFriends = await Friendship.find({ userId, source: "PSN", linkedAccountId: PSNId });
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
                linkedAccountId: PSNId,
                displayName: f.displayName,
                profileUrl: f.profileUrl,
                friendsSince: f.friendsSince,
                avatar: f.avatar,
                originalAvatarUrl: f.originalAvatarUrl,
                status: "accepted",
                source: "PSN",
                requestedByMe: false
            };

            if (!existing || existing.displayName !== f.displayName || existing.avatar !== f.avatar) {
                friendBulkOps.push({
                    updateOne: {
                        filter: { userId, source: "PSN", externalId: f.externalId, linkedAccountId: PSNId },
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

        logger.info({ userId: hashId(userId) }, 'PSN multi-account sync completed');
        res.status(200).json({ message: "PSN synced successfully" });
    }
    catch (error) {
        error.logContext = { userId: hashId(userId) };
        next(error);
    }
};
