// steamService.js
import axios from "axios";
import pLimit from "p-limit";
import http from "http";
import https from "https";
import config from "../config/env.js";
import { uploadImageFromUrl } from "../utils/imageUpload.js";
import { hashId } from "../utils/logSanitize.js";

const STEAM_API_KEY = config.steam.apiKey;

// Concurrency limits
const ACHIEVEMENT_CONCURRENCY = 10;
const FRIENDS_CONCURRENCY = 5;
const achievementLimit = pLimit(ACHIEVEMENT_CONCURRENCY);
const friendsLimit = pLimit(FRIENDS_CONCURRENCY);

// Axios client with TCP keep-alive
const axiosClient = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
    timeout: 8000,
});

// Helper: convert minutes to "Xh Ym Zs"
function formatPlaytime(minutes) {
    if (!minutes || minutes <= 0) return "0h 0m 0s";
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
}

/**
 * Fetch owned games
 */
export async function getOwnedGames(steamId) {
    const url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/";
    const params = {
        key: STEAM_API_KEY,
        steamid: steamId,
        include_appinfo: true,
        include_played_free_games: true,
        format: "json",
    };

    const res = await axiosClient.get(url, { params });
    const response = res.data?.response;

    if (!response?.games || response.games.length === 0) return [];

    return response.games.map((game) => ({
        gameName: game.name,
        gameId: game.appid,
        platform: "steam",
        hoursPlayed: formatPlaytime(game.playtime_forever),
        coverImage: `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`,
        achievements: [],
        progress: null,
        lastPlayed: game.rtime_last_played && game.rtime_last_played !== 0
            ? new Date(game.rtime_last_played * 1000)
            : null,
    }));
}

/**
 * Fetch achievements for games in parallel with limited concurrency
 */
export async function getUserAchievements(steamId, games) {
    if (!Array.isArray(games) || games.length === 0) return [];

    const url = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/";

    const tasks = games.map((game) =>
        achievementLimit(async () => {
            try {
                const params = { key: STEAM_API_KEY, steamid: steamId, appid: game.gameId, l: "en" };
                const res = await axiosClient.get(url, { params });
                const achievements = res.data?.playerstats?.achievements || [];

                if (!achievements.length) {
                    return { ...game, achievements: [], progress: 0 };
                }

                let completedCount = 0;
                const parsed = achievements.map((ach) => {
                    const unlocked = ach.achieved === 1 || ach.unlocktime > 0;
                    if (unlocked) completedCount++;
                    return {
                        id: ach.apiname,
                        title: ach.name || "unknown",
                        description: ach.description || "No description available",
                        unlocked,
                        dateUnlocked: ach.unlocktime ? new Date(ach.unlocktime * 1000) : null,
                    };
                });

                const progress = parsed.length ? Number(((completedCount / parsed.length) * 100).toFixed(2)) : 0;
                return { ...game, achievements: parsed, progress };
            } catch (err) {
                logger.warn({ gameName: game.gameName, gameId: game.gameId, err }, 'Steam achievements fetch failed');
                return { ...game, achievements: [], progress: 0 };
            }
        })
    );

    return await Promise.all(tasks);
}

/**
 * Fetch friend list and summaries in chunks with concurrency
 */
export async function getUserFriendList(steamId, existingFriends = []) {
    try {
        const friendListRes = await axiosClient.get("http://api.steampowered.com/ISteamUser/GetFriendList/v0001/", {
            params: { key: STEAM_API_KEY, steamid: steamId, relationship: "friend" },
        });

        const friendList = friendListRes.data?.friendslist?.friends || [];
        if (friendList.length === 0) return [];

        const friendsMap = new Map(friendList.map((f) => [f.steamid, f.friend_since]));

        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < friendList.length; i += chunkSize) {
            chunks.push(friendList.slice(i, i + chunkSize).map(f => f.steamid));
        }

        const summaryTasks = chunks.map((chunk) =>
            friendsLimit(async () => {
                const res = await axiosClient.get("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
                    params: { key: STEAM_API_KEY, steamids: chunk.join(",") },
                });
                return res.data?.response?.players || [];
            })
        );

        const chunkedResults = await Promise.all(summaryTasks);
        const allPlayers = chunkedResults.flat();

        const formattedFriends = await Promise.all(allPlayers.map((p) =>
            friendsLimit(async () => {
                const freshAvatarUrl = p.avatarfull;

                // Find existing friend data
                const existingFriend = existingFriends.find(f => f.externalId === p.steamid);
                let avatarUrl = existingFriend?.avatar;
                let originalAvatarUrl = existingFriend?.originalAvatarUrl;

                if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
                    const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `steam_friend_${p.steamid}`);
                    if (result) {
                        avatarUrl = result.secure_url;
                        originalAvatarUrl = freshAvatarUrl;
                    }
                }

                return {
                    externalId: p.steamid,
                    displayName: p.personaname,
                    profileUrl: p.profileurl,
                    avatar: avatarUrl,
                    originalAvatarUrl: originalAvatarUrl,
                    friendsSince: friendsMap.has(p.steamid)
                        ? new Date(Number(friendsMap.get(p.steamid)) * 1000)
                        : null,
                };
            })
        ));

        return formattedFriends;
    } catch (err) {
        logger.warn({ accountId: hashId(steamId), err }, 'Steam friend list fetch failed');
        return [];
    }
}
