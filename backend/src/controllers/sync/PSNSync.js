import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode, getProfileFromUserName } from "psn-api";
import { getAllOwnedGames, getFriendList } from "../allPSNInfo.js";
import userModel from "../../models/User.js";
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

        // 2. Update Friends
        const friendsList = await getFriendList(authorization, dbUser.friends?.get("PSN") || []);
        if (!dbUser.friends) dbUser.friends = new Map();

        let currentPsnFriends = dbUser.friends.get("PSN") || [];
        currentPsnFriends = currentPsnFriends.filter(f => f.linkedAccountId !== PSNId);

        const newFriends = friendsList.map(f => ({
            ...f,
            linkedAccountId: PSNId,
            status: "accepted",
            source: "PSN",
            avatar: f.avatar,
            originalAvatarUrl: f.originalAvatarUrl
        }));

        // Deduplicate across all PSN accounts for this user
        const friendsMap = new Map();
        [...currentPsnFriends, ...newFriends].forEach(f => {
            friendsMap.set(f.externalId, f);
        });

        dbUser.friends.set("PSN", Array.from(friendsMap.values()));

        // 3. Update Owned Games
        const games = await getAllOwnedGames(authorization);
        if (!dbUser.ownedGames) dbUser.ownedGames = new Map();
        let psnGamesMap = dbUser.ownedGames.get("PSN") || new Map();

        for (const game of games) {
            if (!game || !game.gameId) continue;

            const gameId = String(game.gameId);

            let existingGame = psnGamesMap.get(gameId);
            const ownerRecord = {
                accountId: PSNId,
                accountName: PSNId,
                hoursPlayed: game.hoursPlayed,
                lastPlayed: game.lastPlayed,
                progress: game.progress || 0,
                achievements: game.achievements || []
            };

            if (existingGame) {
                const existingOwnerIndex = existingGame.owners.findIndex(o => o.accountId === PSNId);
                if (existingOwnerIndex > -1) {
                    existingGame.owners[existingOwnerIndex] = ownerRecord;
                } else {
                    existingGame.owners.push(ownerRecord);
                }
                existingGame.maxProgress = Math.max(...existingGame.owners.map(o => o.progress || 0));
            } else {
                psnGamesMap.set(gameId, {
                    gameName: game.gameName,
                    gameId: game.gameId,
                    platform: game.platform,
                    coverImage: game.coverImage,
                    owners: [ownerRecord],
                    maxProgress: ownerRecord.progress,
                    totalHours: ownerRecord.hoursPlayed
                });
            }
        }
        dbUser.ownedGames.set("PSN", psnGamesMap);

        await dbUser.save();

        logger.info({ userId: hashId(userId) }, 'PSN multi-account sync completed');
        res.status(200).json({ message: "PSN synced successfully" });
    }
    catch (error) {
        error.logContext = { userId: hashId(userId) };
        next(error);
    }
};
