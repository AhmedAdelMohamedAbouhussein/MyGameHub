import axios from "axios";
import userModel from "../models/User.js";
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

        //* ----- STEAM REFRESH -----
        const steamAccounts = linkedAccounts.get("Steam") || [];
        for (const account of steamAccounts) {
            try {
                const ownedGames = await getOwnedGames(parseInt(account.accountId));
                const gamesWithAchievements = await getUserAchievements(parseInt(account.accountId), ownedGames);

                let platformGamesMap = dbUser.ownedGames.get("Steam") || new Map();
                updateGamesMapWithAccountData(platformGamesMap, gamesWithAchievements, account);
                dbUser.ownedGames.set("Steam", platformGamesMap);
                hasChanges = true;
            } catch (error) {
                logger.error({ err: error, accountId: hashId(account.accountId) }, 'Steam refresh error');
                errors.push({ platform: 'Steam', account: account.accountId, message: error.message });
            }
        }

        //* ----- XBOX REFRESH -----
        const xboxAccounts = linkedAccounts.get("Xbox") || [];
        for (let i = 0; i < xboxAccounts.length; i++) {
            const account = xboxAccounts[i];

            // If the cron already flagged this token as invalid, skip the API call
            // and tell the frontend it needs to re-sync
            if (account.tokenStatus === 'invalid') {
                errors.push({
                    platform: 'Xbox',
                    account: account.accountId,
                    requiresReauth: true,
                    message: 'Your Xbox session has expired. Please re-sync to continue.',
                    resyncUrl: '/library/sync/xbox'
                });
                continue;
            }

            try {
                // Token refresh logic for Xbox
                const CLIENT_ID = config.azure.clientId;
                const CLIENT_SECRET = config.azure.clientSecret;
                const REDIRECT_URI = config.xboxRedirectURL;

                const tokenRes = await axios.post("https://login.live.com/oauth20_token.srf", new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: "refresh_token",
                    refresh_token: account.refreshToken,
                    redirect_uri: REDIRECT_URI,
                }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

                const accessToken = tokenRes.data.access_token;
                account.refreshToken = tokenRes.data.refresh_token;
                account.expiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
                account.tokenStatus = 'active';

                const userAuthRes = await axios.post("https://user.auth.xboxlive.com/user/authenticate", {
                    Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${accessToken}` },
                    RelyingParty: "http://auth.xboxlive.com", TokenType: "JWT"
                });

                const userToken = userAuthRes.data.Token;
                const userHash = userAuthRes.data.DisplayClaims.xui[0].uhs;

                const xstsRes = await axios.post("https://xsts.auth.xboxlive.com/xsts/authorize", {
                    Properties: { SandboxId: "RETAIL", UserTokens: [userToken] },
                    RelyingParty: "http://xboxlive.com", TokenType: "JWT"
                });

                const xstsToken = xstsRes.data.Token;
                const noAchGames = await getXboxOwnedGames(account.accountId, userHash, xstsToken);
                const games = await enrichOwnedGamesWithAchievements(account.accountId, noAchGames, userHash, xstsToken);

                let platformGamesMap = dbUser.ownedGames.get("Xbox") || new Map();
                updateGamesMapWithAccountData(platformGamesMap, games, account);
                dbUser.ownedGames.set("Xbox", platformGamesMap);
                hasChanges = true;

            } catch (error) {
                if (isOAuthAuthFailure(error)) {
                    account.tokenStatus = 'invalid';
                    hasChanges = true;
                    errors.push({
                        platform: 'Xbox',
                        account: account.accountId,
                        requiresReauth: true,
                        message: 'Your Xbox session has expired. Please re-sync to continue.',
                        resyncUrl: '/library/sync/xbox'
                    });
                } else {
                    logger.error({ err: error, accountId: hashId(account.accountId) }, 'Xbox refresh error');
                    errors.push({ platform: 'Xbox', account: account.accountId, message: error.message });
                }
            }
        }

        //* ----- PSN REFRESH -----
        const psnAccounts = linkedAccounts.get("PSN") || [];
        for (let i = 0; i < psnAccounts.length; i++) {
            const account = psnAccounts[i];

            // If the cron already flagged this token as invalid, skip the API call
            if (account.tokenStatus === 'invalid') {
                errors.push({
                    platform: 'PSN',
                    account: account.accountId,
                    requiresReauth: true,
                    message: 'Your PlayStation session has expired. Please re-sync to continue.',
                    resyncUrl: '/library/sync/psn'
                });
                continue;
            }

            try {
                const updatedAuthorization = await exchangeRefreshTokenForAuthTokens(account.refreshToken);
                if (updatedAuthorization.refreshToken) {
                    account.refreshToken = updatedAuthorization.refreshToken;
                }
                const expiresInSec = updatedAuthorization.refreshTokenExpiresIn || (55 * 24 * 60 * 60);
                account.expiresAt = new Date(Date.now() + (expiresInSec * 1000) - (24 * 60 * 60 * 1000));
                account.tokenStatus = 'active';

                const games = await getAllOwnedGames(updatedAuthorization);
                let platformGamesMap = dbUser.ownedGames.get("PSN") || new Map();
                updateGamesMapWithAccountData(platformGamesMap, games, account);
                dbUser.ownedGames.set("PSN", platformGamesMap);
                hasChanges = true;
            } catch (error) {
                if (isOAuthAuthFailure(error)) {
                    account.tokenStatus = 'invalid';
                    hasChanges = true;
                    errors.push({
                        platform: 'PSN',
                        account: account.accountId,
                        requiresReauth: true,
                        message: 'Your PlayStation session has expired. Please re-sync to continue.',
                        resyncUrl: '/library/sync/psn'
                    });
                } else {
                    logger.error({ err: error, accountId: hashId(account.accountId) }, 'PSN refresh error');
                    errors.push({ platform: 'PSN', account: account.accountId, message: error.message });
                }
            }
        }

        if (hasChanges) {
            dbUser.markModified('ownedGames');
            dbUser.markModified('linkedAccounts');
            await dbUser.save();
        }

        return res.status(200).json({
            message: errors.length > 0 ? "Refresh completed with some errors" : "Library refreshed successfully",
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        error.logContext = {};
        next(error);
    }
};

/**
 * Helper to update the unified games map with fresh data from a specific account
 */
function updateGamesMapWithAccountData(gamesMap, freshGames, account) {
    for (const game of freshGames) {
        if (!game || !game.gameId) continue;

        let existingGame = gamesMap.get(game.gameId);
        const ownerRecord = {
            accountId: account.accountId,
            accountName: account.displayName,
            hoursPlayed: game.hoursPlayed,
            lastPlayed: game.lastPlayed,
            progress: game.progress || 0,
            achievements: game.achievements || []
        };

        if (existingGame) {
            const ownerIndex = existingGame.owners.findIndex(o => o.accountId === account.accountId);
            if (ownerIndex > -1) {
                existingGame.owners[ownerIndex] = ownerRecord;
            } else {
                existingGame.owners.push(ownerRecord);
            }
            existingGame.maxProgress = Math.max(...existingGame.owners.map(o => o.progress || 0));
        } else {
            gamesMap.set(game.gameId, {
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
}
