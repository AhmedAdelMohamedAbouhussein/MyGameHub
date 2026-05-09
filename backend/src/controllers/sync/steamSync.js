import axios from 'axios';
import passport from "passport";
import SteamStrategy from "passport-steam";
import config from '../../config/env.js'
import userModel from "../../models/User.js";
import UserGame from "../../models/UserGame.js";
import Friendship from "../../models/Friendship.js";
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

            // 1. Parallelize API calls for maximum speed
            const [noAchGames, friendsList] = await Promise.all([
                getOwnedGames(steamId),
                getUserFriendList(steamId, existingAcc?.friends || [])
            ]);

            const games = await getUserAchievements(steamId, noAchGames);

            // 2. Fetch all existing games for this user/platform once
            const existingGames = await UserGame.find({ userId, platform: "Steam" });
            const existingGamesMap = new Map(existingGames.map(g => [g.gameId, g]));

            // 3. Process Games in memory
            const gameBulkOps = [];
            for (const game of games) {
                if (!game || !game.gameId) continue;
                const gameId = String(game.gameId);

                const ownerRecord = {
                    accountId: steamId,
                    accountName: displayName,
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
                    const ownerIndex = existingGame.owners.findIndex(o => o.accountId === steamId);
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
                        filter: { userId, platform: "Steam", gameId },
                        update: {
                            $set: {
                                gameName: game.gameName,
                                coverImage: game.coverImage,
                                totalHours: ownerRecord.hoursPlayed,
                                owners: updatedOwners,
                                maxProgress: Math.max(...updatedOwners.map(o => o.progress || 0))
                            },
                            $setOnInsert: { userId, platform: "Steam", gameId }
                        },
                        upsert: true
                    }
                });
            }

            if (gameBulkOps.length > 0) {
                await UserGame.bulkWrite(gameBulkOps, { ordered: false });
            }

            // 4. Process Friends with Diff-based Sync
            const existingFriends = await Friendship.find({ userId, source: "Steam", linkedAccountId: steamId });
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
                    linkedAccountId: steamId,
                    displayName: f.displayName,
                    profileUrl: f.profileUrl,
                    friendsSince: f.friendsSince,
                    avatar: f.avatar,
                    originalAvatarUrl: f.originalAvatarUrl,
                    status: "accepted",
                    source: "Steam",
                    requestedByMe: false
                };

                // Only update if something changed (Basic diffing)
                if (!existing || existing.displayName !== f.displayName || existing.avatar !== f.avatar) {
                    friendBulkOps.push({
                        updateOne: {
                            filter: { userId, source: "Steam", externalId: f.externalId, linkedAccountId: steamId },
                            update: { $set: friendDoc },
                            upsert: true
                        }
                    });
                }
            }

            // Remove friends that are no longer in the list
            const friendsToDelete = existingFriends
                .filter(f => !newFriendExternalIds.has(f.externalId))
                .map(f => f._id);

            if (friendsToDelete.length > 0) {
                friendBulkOps.push({
                    deleteMany: { filter: { _id: { $in: friendsToDelete } } }
                });
            }

            if (friendBulkOps.length > 0) {
                await Friendship.bulkWrite(friendBulkOps, { ordered: false });
            }

            // 5. Final Save
            await dbUser.save();

            res.redirect(`${APP_FRONTEND_URL}/library`)
        }
        catch (dbErr) {
            dbErr.logContext = { platform: "Steam" };
            return next(dbErr);
        }
    })(req, res, next); // <-- still need this
};

