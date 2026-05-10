import axios from "axios";
import userModel from "../models/User.js";
import UserGame from "../models/UserGame.js";
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { hashId } from '../utils/logSanitize.js';

import { getOwnedGames, getUserAchievements } from "./allSteamInfo.js";
import { getXboxOwnedGames, enrichOwnedGamesWithAchievements } from "./allxboxinfo.js";
import { exchangeRefreshTokenForAuthTokens } from "psn-api";
import { getAllOwnedGames } from "./allPSNInfo.js"
import { isOAuthAuthFailure } from "../utils/oauthHelpers.js";

export const refreshOwnedGames = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        // Fetch user with linkedAccounts and tokens
        const dbUser = await userModel.findById(userId).select("+linkedAccounts");

        if (!dbUser) return res.status(404).json({ message: "User not found" });

        const linkedAccounts = dbUser.linkedAccounts || new Map();
        const errors = [];
        let hasChanges = false;

        // Initialize ownedGames if not exists
        if (!dbUser.ownedGames) dbUser.ownedGames = new Map();

        // 1. Parallelize refreshes across ALL platforms and accounts
        const refreshTasks = [];

        // STEAM
        const steamAccounts = linkedAccounts.get("Steam") || [];
        for (const account of steamAccounts) {
            refreshTasks.push((async () => {
                try {
                    const ownedGames = await getOwnedGames(parseInt(account.accountId));
                    const gamesWithAchievements = await getUserAchievements(parseInt(account.accountId), ownedGames);
                    await updateNormalizedGames(userId, gamesWithAchievements, account, "Steam");
                } catch (error) {
                    logger.error({ 
                        message: error.message, 
                        status: error.response?.status,
                        accountId: hashId(account.accountId) 
                    }, 'Steam refresh error');
                    errors.push({ platform: 'Steam', account: account.accountId, message: error.message });
                }
            })());
        }

        // XBOX
        const xboxAccounts = linkedAccounts.get("Xbox") || [];
        for (const account of xboxAccounts) {
            if (account.tokenStatus === 'invalid') {
                errors.push({ platform: 'Xbox', account: account.accountId, requiresReauth: true, message: 'Session expired' });
                continue;
            }
            refreshTasks.push((async () => {
                try {
                    // Token refresh
                    const tokenRes = await axios.post("https://login.live.com/oauth20_token.srf", new URLSearchParams({
                        client_id: config.azure.clientId,
                        client_secret: config.azure.clientSecret,
                        grant_type: "refresh_token",
                        refresh_token: account.refreshToken,
                        redirect_uri: config.xboxRedirectURL,
                    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

                    account.refreshToken = tokenRes.data.refresh_token;
                    account.expiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
                    account.tokenStatus = 'active';

                    const userAuthRes = await axios.post("https://user.auth.xboxlive.com/user/authenticate", {
                        Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${tokenRes.data.access_token}` },
                        RelyingParty: "http://auth.xboxlive.com", TokenType: "JWT"
                    });

                    const xstsRes = await axios.post("https://xsts.auth.xboxlive.com/xsts/authorize", {
                        Properties: { SandboxId: "RETAIL", UserTokens: [userAuthRes.data.Token] },
                        RelyingParty: "http://xboxlive.com", TokenType: "JWT"
                    });

                    const xstsToken = xstsRes.data.Token;
                    const userHash = userAuthRes.data.DisplayClaims.xui[0].uhs;
                    
                    const noAchGames = await getXboxOwnedGames(account.accountId, userHash, xstsToken);
                    const games = await enrichOwnedGamesWithAchievements(account.accountId, noAchGames, userHash, xstsToken);
                    await updateNormalizedGames(userId, games, account, "Xbox");
                    hasChanges = true;
                } catch (error) {
                    if (isOAuthAuthFailure(error)) {
                        account.tokenStatus = 'invalid';
                        hasChanges = true;
                        errors.push({ platform: 'Xbox', account: account.accountId, requiresReauth: true });
                    } else {
                        logger.error({ 
                            message: error.message, 
                            status: error.response?.status,
                            accountId: hashId(account.accountId) 
                        }, 'Xbox refresh error');
                        errors.push({ platform: 'Xbox', account: account.accountId, message: error.message });
                    }
                }
            })());
        }

        // PSN
        const psnAccounts = linkedAccounts.get("PSN") || [];
        for (const account of psnAccounts) {
            if (account.tokenStatus === 'invalid') {
                errors.push({ platform: 'PSN', account: account.accountId, requiresReauth: true });
                continue;
            }
            refreshTasks.push((async () => {
                try {
                    const updatedAuth = await exchangeRefreshTokenForAuthTokens(account.refreshToken);
                    if (updatedAuth.refreshToken) account.refreshToken = updatedAuth.refreshToken;
                    account.expiresAt = new Date(Date.now() + ((updatedAuth.refreshTokenExpiresIn || 4752000) * 1000) - (24 * 60 * 60 * 1000));
                    account.tokenStatus = 'active';

                    const games = await getAllOwnedGames(updatedAuth);
                    await updateNormalizedGames(userId, games, account, "PSN");
                    hasChanges = true;
                } catch (error) {
                    if (isOAuthAuthFailure(error)) {
                        account.tokenStatus = 'invalid';
                        hasChanges = true;
                        errors.push({ platform: 'PSN', account: account.accountId, requiresReauth: true });
                    } else {
                        logger.error({ 
                            message: error.message, 
                            status: error.response?.status,
                            accountId: hashId(account.accountId) 
                        }, 'PSN refresh error');
                        errors.push({ platform: 'PSN', account: account.accountId, message: error.message });
                    }
                }
            })());
        }

        // Execute all refresh tasks in parallel
        if (refreshTasks.length > 0) {
            await Promise.all(refreshTasks);
            hasChanges = true;
        }

        if (hasChanges) {
            dbUser.markModified('linkedAccounts');
            await dbUser.save();
        }

        return res.status(200).json({
            message: errors.length > 0 ? "Refresh completed with some errors" : "Library refreshed successfully",
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Super-Optimized Helper: Memory-Merge & Single-Pass Write
 */
async function updateNormalizedGames(userId, freshGames, account, platform) {
    if (!freshGames || freshGames.length === 0) return;

    const mongoose = (await import('mongoose')).default;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Fetch all existing games for this platform once
    const existingGames = await UserGame.find({ userId: userObjectId, platform });
    const existingGamesMap = new Map(existingGames.map(g => [g.gameId, g]));

    const bulkOps = [];
    for (const game of freshGames) {
        if (!game || !game.gameId) continue;
        const gameId = String(game.gameId);

        const ownerRecord = {
            accountId: account.accountId,
            accountName: account.displayName,
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
            const ownerIdx = existingGame.owners.findIndex(o => o.accountId === account.accountId);
            updatedOwners = [...existingGame.owners];
            if (ownerIdx > -1) updatedOwners[ownerIdx] = ownerRecord;
            else updatedOwners.push(ownerRecord);
        } else {
            updatedOwners = [ownerRecord];
        }

        // ONE OPERATION PER GAME
        bulkOps.push({
            updateOne: {
                filter: { userId: userObjectId, platform, gameId },
                update: {
                    $set: {
                        gameName: game.gameName,
                        coverImage: game.coverImage,
                        totalHours: ownerRecord.hoursPlayed,
                        owners: updatedOwners,
                        maxProgress: Math.max(...updatedOwners.map(o => o.progress || 0))
                    },
                    $setOnInsert: { userId: userObjectId, platform, gameId }
                },
                upsert: true
            }
        });
    }

    if (bulkOps.length > 0) {
        await UserGame.bulkWrite(bulkOps, { ordered: false });
    }
}
