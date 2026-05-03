import axios from 'axios';
import passport from "passport";
import SteamStrategy from "passport-steam";
import config from '../../config/env.js'
import userModel from "../../models/User.js";
import logger from "../../utils/logger.js";

import { getOwnedGames, getUserAchievements, getUserFriendList } from '../allSteamInfo.js'
import { uploadImageFromUrl } from "../../utils/imageUpload.js";

const APP_FRONTEND_URL = config.frontendUrl;
const APP_BACKEND_URL = config.appUrl;
const STEAM_API_KEY = config.steam.apiKey;

//                                              **steam**

// Configure passport strategy ONCE (not inside your controller)
passport.use(
    new SteamStrategy(
        {
            returnURL: `${APP_BACKEND_URL}/api/sync/steam/return`,
            realm: APP_BACKEND_URL,
            apiKey: STEAM_API_KEY,
        },
        async function (identifier, profile, done) {
            try {
                // Extract the steamID from profile
                const steamId = profile._json.steamid;

                // Fetch player summary using Steam Web API
                const response = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`,
                    {
                        params:
                        {
                            key: STEAM_API_KEY,
                            steamids: steamId,
                        },
                    });

                // Attach Steam API data to profile
                const players = response.data?.response?.players;
                if (Array.isArray(players) && players.length > 0) {
                    profile.summary = players[0];
                }
                else {
                    logger.warn({ data: response.data }, 'No players returned from Steam API');
                    profile.summary = null;
                }
                return done(null, profile);
            }
            catch (error) {
                return done(error, null);
            }
        }));

// @desc  get steamdi and steam info
// @route GET /sync/steam
export const syncWithSteam = async (req, res, next) => {
    try {
        passport.authenticate("steam", async (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                const error = new Error("Steam login failed");
                error.status = 401
                return next(error);
            }

            // Return both passport profile + Steam API data
            res.status(200).json({ profile: user });
        })(req, res, next);
    }
    catch (error) {
        error.logContext = { userId: hashId(userId), platform: "Steam" };
        next(error);
    }
}

// @desc  get steamid and steam info
// @route GET /sync/steam/return
export const steamReturn = (req, res, next) => {

    passport.authenticate("steam", { failureRedirect: `${APP_FRONTEND_URL}/`, session: false }, async (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect("/"); // failed login
        }


        // ✅ Steam login succeeded
        try {
            const userId = req.session.userId;
            const steamId = user._json.steamid;
            const displayName = user.displayName || user._json.personaname;
            const freshAvatarUrl = user._json.avatarfull;

            // 1. Fetch User and Check for existing account
            const dbUser = await userModel.findById(userId);
            if (!dbUser) return res.redirect("/");

            let linkedAccounts = dbUser.linkedAccounts || new Map();
            let steamAccounts = linkedAccounts.get("Steam") || [];

            const existingAccIndex = steamAccounts.findIndex(acc => acc.accountId === steamId);
            const existingAcc = existingAccIndex > -1 ? steamAccounts[existingAccIndex] : null;

            let avatar = existingAcc?.avatar;
            let originalAvatarUrl = existingAcc?.originalAvatarUrl;

            // Upload user's account avatar to Cloudinary ONLY if it changed
            if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
                const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `steam_user_${steamId}`);
                if (result) {
                    avatar = result.secure_url;
                    originalAvatarUrl = freshAvatarUrl;
                }
            }

            const accountData = {
                accountId: steamId,
                displayName,
                avatar,
                originalAvatarUrl,
                lastSync: new Date()
            }
            if (existingAccIndex > -1) {
                steamAccounts[existingAccIndex] = accountData;
            } else {
                steamAccounts.push(accountData);
            }
            linkedAccounts.set("Steam", steamAccounts);
            dbUser.linkedAccounts = linkedAccounts;

            // 2. Fetch Games
            const noAchGames = await getOwnedGames(steamId);
            const games = await getUserAchievements(steamId, noAchGames);

            // 3. Update Owned Games (Additive/Unified)
            if (!dbUser.ownedGames) dbUser.ownedGames = new Map();
            let steamGamesMap = dbUser.ownedGames.get("Steam") || new Map();

            for (const game of games) {
                if (!game || !game.gameId) continue;

                const gameId = String(game.gameId);

                let existingGame = steamGamesMap.get(gameId);
                const ownerRecord = {
                    accountId: steamId,
                    accountName: displayName,
                    hoursPlayed: game.hoursPlayed,
                    lastPlayed: game.lastPlayed,
                    progress: game.progress || 0,
                    achievements: game.achievements || []
                };

                if (existingGame) {
                    // Update or add owner record
                    const existingOwnerIndex = existingGame.owners.findIndex(o => o.accountId === steamId);
                    if (existingOwnerIndex > -1) {
                        existingGame.owners[existingOwnerIndex] = ownerRecord;
                    } else {
                        existingGame.owners.push(ownerRecord);
                    }

                    // Recalculate summary stats
                    existingGame.maxProgress = Math.max(...existingGame.owners.map(o => o.progress || 0));
                    // simple total for hours (could be more complex if overlapping)
                    // existingGame.totalHours = ...
                } else {
                    // New unified game record
                    steamGamesMap.set(gameId, {
                        gameName: game.gameName,
                        gameId: gameId,
                        platform: game.platform,
                        coverImage: game.coverImage,
                        owners: [ownerRecord],
                        maxProgress: ownerRecord.progress,
                        totalHours: ownerRecord.hoursPlayed
                    });
                }
            }
            dbUser.ownedGames.set("Steam", steamGamesMap);

            // 4. Update Friends
            const friendsList = await getUserFriendList(steamId, dbUser.friends?.get("Steam") || []);
            if (!dbUser.friends) dbUser.friends = new Map();

            // Filter out existing friends from THIS account to replace them with fresh data
            let currentSteamFriends = dbUser.friends.get("Steam") || [];
            currentSteamFriends = currentSteamFriends.filter(f => f.linkedAccountId !== steamId);

            const newFriends = friendsList.map(f => ({
                user: null,
                externalId: f.externalId,
                linkedAccountId: steamId,
                displayName: f.displayName,
                profileUrl: f.profileUrl,
                friendsSince: f.friendsSince,
                avatar: f.avatar,
                originalAvatarUrl: f.originalAvatarUrl,
                status: "accepted",
                source: "Steam"
            }));

            // Deduplicate across all Steam accounts for this user
            const friendsMap = new Map();
            [...currentSteamFriends, ...newFriends].forEach(f => {
                friendsMap.set(f.externalId, f);
            });

            dbUser.friends.set("Steam", Array.from(friendsMap.values()));

            // Save everything
            await dbUser.save();

            res.redirect(`${APP_FRONTEND_URL}/library`)
        }
        catch (dbErr) {
            dbErr.logContext = { platform: "Steam" };
            return next(dbErr);
        }
    })(req, res, next); // <-- still need this
};

