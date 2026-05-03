import axios from "axios";
import pLimit from "p-limit";
import http from "http";
import https from "https";

import config from "../config/env.js";
import { uploadImageFromUrl } from "../utils/imageUpload.js";
import logger from "../utils/logger.js";
import { hashId } from "../utils/logSanitize.js";

const RAWG_API_KEY = config.RAWG_API_KEY;

// Concurrency limits
const ACHIEVEMENT_CONCURRENCY = 10;
const FRIENDS_CONCURRENCY = 5;
const achievementLimit = pLimit(ACHIEVEMENT_CONCURRENCY);
const friendsLimit = pLimit(FRIENDS_CONCURRENCY);

// Axios with TCP keep-alive for maximum speed
const axiosClient = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 8000
});

/**
 * Fetch Xbox profile (NO CACHE)
 */
export async function getXboxProfile(xuid, userHash, xstsToken) {
    try {
        const res = await axiosClient.get(
            `https://profile.xboxlive.com/users/xuid(${xuid})/profile/settings?settings=Gamertag,GameDisplayPicRaw`,
            {
                headers: {
                    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
                    "x-xbl-contract-version": "2",
                },
            }
        );

        const user = res.data.profileUsers[0];

        return {
            xuid: user.id,
            gamertag: user.settings.find(s => s.id === "Gamertag")?.value,
            avatar: user.settings.find(s => s.id === "GameDisplayPicRaw")?.value,
        };

    } catch (err) {
        logger.warn({ xuid: hashId(xuid), err }, 'Xbox profile fetch failed');
        return null;
    }
}

/**
 * Fetch friends list (fresh every time, no cache)
 */
export async function getXboxFriends(xuid, userHash, xstsToken, existingFriends = []) {
    try {
        const res = await axiosClient.get(
            `https://social.xboxlive.com/users/xuid(${xuid})/people?view=All`,
            {
                headers: {
                    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
                    "X-RequestedServiceVersion": 1,
                    Accept: "application/json",
                },
            }
        );

        if (!res.data?.people) return [];

        const friends = res.data.people.map(friend => ({
            externalId: friend.xuid,
            profileUrl: null,
            friendsSince: new Date(friend.addedDateTimeUtc),
        }));

        // Fetch profiles in parallel
        const detailed = await Promise.all(
            friends.map(friend =>
                friendsLimit(async () => {
                    const profile = await getXboxProfile(friend.externalId, userHash, xstsToken);
                    if (!profile) return null;

                    const freshAvatarUrl = profile.avatar;

                    // Find existing friend data
                    const existingFriend = existingFriends.find(f => f.externalId === friend.externalId);
                    let avatarUrl = existingFriend?.avatar;
                    let originalAvatarUrl = existingFriend?.originalAvatarUrl;

                    if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
                        const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `xbox_friend_${friend.externalId}`);
                        if (result) {
                            avatarUrl = result.secure_url;
                            originalAvatarUrl = freshAvatarUrl;
                        }
                    }

                    return {
                        ...friend,
                        displayName: profile.gamertag,
                        avatar: avatarUrl,
                        originalAvatarUrl: originalAvatarUrl
                    };
                })
            )
        );

        return detailed.filter(f => f !== null);

    } catch (err) {
        logger.warn({ xuid: hashId(xuid), err }, 'Xbox friends fetch failed');
        return [];
    }
}

/**
 * Get all owned games
 */
export async function getXboxOwnedGames(xuid, userHash, xstsToken) {
    try {
        const res = await axiosClient.get(
            `https://achievements.xboxlive.com/users/xuid(${xuid})/history/titles`,
            {
                headers: {
                    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
                    "x-xbl-contract-version": "2",
                },
            }
        );

        if (!res.data?.titles) return [];

        return res.data.titles.map(game => ({
            gameName: game.name,
            gameId: game.titleId,
            platform: "xbox",
            lastPlayed: game.lastUnlock ? new Date(game.lastUnlock) : null,
            coverImage: null,
            hoursPlayed: null,
            achievements: [],
            progress: null,
        }));

    } catch (err) {
        logger.warn({ xuid: hashId(xuid), err }, 'Xbox owned games fetch failed');
        return [];
    }
}

/**
 * Fetch achievements fresh every time
 */
export async function getXboxAchievements(xuid, titleId, userHash, xstsToken) {
    try {
        const res = await axiosClient.get(
            `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements?titleId=${titleId}`,
            {
                headers: {
                    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
                    "x-xbl-contract-version": "2",
                },
            }
        );

        return (res.data.achievements || []).map(ach => ({
            title: ach.name,
            description: ach.description || "No description",
            unlocked: ach.progressState === "Achieved",
            dateUnlocked: ach.progressState === "Achieved" ? new Date(ach.progression?.timeUnlocked) : null,
        }));

    } catch (err) {
        logger.warn({ titleId, err }, 'Xbox achievements fetch failed');
        return [];
    }
}



const RAWG_CONCURRENCY = 10;
const rawgLimit = pLimit(RAWG_CONCURRENCY);

/**
 * Fetch game cover from RAWG API
 */
async function getRawgGameCover(gameName, platformSlug = null) {
    try {
        const res = await axiosClient.get(`https://api.rawg.io/api/games`, {
            params: {
                key: RAWG_API_KEY,
                search: gameName,
                page_size: 5 // fetch a few results to improve matching
            }
        });

        if (!res.data.results || res.data.results.length === 0) return null;

        // Try to find the best match by name (case-insensitive)
        const match = res.data.results.find(game => {
            const nameMatch = game.name.toLowerCase() === gameName.toLowerCase();
            if (!platformSlug) return nameMatch;
            // Check if platform matches
            const platformMatch = game.platforms?.some(p => p.platform.slug === platformSlug);
            return nameMatch && platformMatch;
        }) || res.data.results[0]; // fallback to first if no exact match

        return match.background_image || null;

    } catch (err) {
        logger.warn({ gameName, err }, 'RAWG image fetch failed');
        return null;
    }
}

/**
 * Enrich games with achievements (parallel, no cache)
 */
export async function enrichOwnedGamesWithAchievements(xuid, games, userHash, xstsToken) {
    return await Promise.all(
        games.map(game =>
            achievementLimit(async () => {
                const achievements = await getXboxAchievements(
                    xuid,
                    game.gameId,
                    userHash,
                    xstsToken
                );

                const completed = achievements.filter(a => a.unlocked).length;
                const progress = achievements.length
                    ? Number(((completed / achievements.length) * 100).toFixed(2))
                    : 0;

                // Get RAWG cover image (rate-limited)
                const coverImage = await rawgLimit(() => getRawgGameCover(game.gameName));

                return { ...game, achievements, progress, coverImage };
            })
        )
    );
}
