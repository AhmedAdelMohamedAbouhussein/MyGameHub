import {
    getTitleTrophies,
    getUserTitles,
    getUserTrophiesEarnedForTitle,
    //TrophyRarity,
    getUserFriendsAccountIds,
    getProfileFromAccountId
} from "psn-api";

import http from "http";
import https from "https";
import pLimit from "p-limit";
import { uploadImageFromUrl } from "../utils/imageUpload.js";
import logger from "../utils/logger.js";
import { hashId } from "../utils/logSanitize.js";

// Global TCP keep-alive + 8s socket timeout (same as Steam/Xbox)
const agent = {
    http: new http.Agent({ keepAlive: true, timeout: 8000 }),
    https: new https.Agent({ keepAlive: true, timeout: 8000 })
};

// Concurrency limits
const ACHIEVEMENT_CONCURRENCY = 10;
const FRIENDS_CONCURRENCY = 5;
const achievementLimit = pLimit(ACHIEVEMENT_CONCURRENCY);
const friendsLimit = pLimit(FRIENDS_CONCURRENCY);

// -------- FRIEND LIST --------

export const getFriendList = async (authorization, existingFriends = []) => {
    const response = await getUserFriendsAccountIds(authorization, "me", {
        agent
    });

    const friends = response.friends || [];

    const friendProfiles = await Promise.all(
        friends.map((friend) =>
            friendsLimit(async () => {
                try {
                    const profile = await getProfileFromAccountId(
                        authorization,
                        friend,
                        { agent }
                    );

                    const freshAvatarUrl = profile.avatars[2]?.url || null;

                    // Find existing friend data
                    const existingFriend = existingFriends.find(f => f.externalId === friend);
                    let avatarUrl = existingFriend?.avatar;
                    let originalAvatarUrl = existingFriend?.originalAvatarUrl;

                    if (freshAvatarUrl && freshAvatarUrl !== originalAvatarUrl) {
                        const result = await uploadImageFromUrl(freshAvatarUrl, "avatars", `psn_friend_${friend}`);
                        if (result) {
                            avatarUrl = result.secure_url;
                            originalAvatarUrl = freshAvatarUrl;
                        }
                    }

                    return {
                        externalId: friend,
                        displayName: profile.onlineId,
                        avatar: avatarUrl,
                        originalAvatarUrl: originalAvatarUrl,
                        status: "accepted",
                        source: "psn",
                        friendsSince: null,
                        profileUrl: "https://profile.playstation.com/" + profile.onlineId
                    };
                } catch (friendErr) {
                    logger.warn({ externalId: hashId(friend), err: friendErr.message }, 'PSN friend processing failed, skipping');
                    return null;
                }
            })
        )
    );

    return friendProfiles.filter(f => f !== null);
};

// -------- OWNED GAMES --------

export const getAllOwnedGames = async (authorization) => {
    const result = await getUserTitles(
        { accessToken: authorization.accessToken },
        "me",
        { agent }
    );

    const trophyTitles = result.trophyTitles || [];

    const games = await Promise.all(
        trophyTitles.map((title, idx) =>
            achievementLimit(async () => {
                try {
                    const npServiceName =
                        title.trophyTitlePlatform.includes("PS5")
                            ? undefined
                            : "trophy";

                    const [titleTrophies, earnedTrophies] = await Promise.all([
                        getTitleTrophies(
                            authorization,
                            title.npCommunicationId,
                            "all",
                            { npServiceName, agent }
                        ),
                        getUserTrophiesEarnedForTitle(
                            authorization,
                            "me",
                            title.npCommunicationId,
                            "all",
                            { npServiceName, agent }
                        )
                    ]);

                    const mergedTrophies = mergeTrophyLists(
                        titleTrophies.trophies,
                        earnedTrophies.trophies
                    );

                    return {
                        gameName: title.trophyTitleName,
                        gameId: title.npCommunicationId,
                        platform: "PSN",
                        progress: title.progress,
                        coverImage: title.trophyTitleIconUrl,
                        achievements: mergedTrophies,
                        hoursPlayed: null,
                        lastPlayed: title.lastUpdatedDateTime ? new Date(title.lastUpdatedDateTime) : null,
                    };
                } catch (gameErr) {
                    logger.warn({ gameId: title.npCommunicationId, gameName: title.trophyTitleName, err: gameErr.message }, 'PSN trophy fetch failed for game, skipping trophies');
                    return {
                        gameName: title.trophyTitleName,
                        gameId: title.npCommunicationId,
                        platform: "PSN",
                        progress: title.progress || 0,
                        coverImage: title.trophyTitleIconUrl,
                        achievements: [],
                        hoursPlayed: null,
                        lastPlayed: title.lastUpdatedDateTime ? new Date(title.lastUpdatedDateTime) : null,
                    };
                }
            })
        )
    );

    return games;
};

// ---------------- Helper Functions ----------------

const mergeTrophyLists = (titleTrophies, earnedTrophies) => {
    const merged = [];

    for (const earned of earnedTrophies) {
        const base = titleTrophies.find(
            (t) => t.trophyId === earned.trophyId
        );

        merged.push(
            normalizeTrophy({
                ...base,
                ...earned
            })
        );
    }

    return merged;
};

const normalizeTrophy = (trophy) => {
    return {
        unlocked: trophy.earned ?? false,
        dateUnlocked: trophy.earned ? new Date(trophy.earnedDateTime) : null,
        description: trophy.trophyDetail ? trophy.trophyDetail : "",
        type: trophy.trophyType,
        //rarity: rarityMap[trophy.trophyRare ?? 0],
        //earnedRate: Number(trophy.trophyEarnedRate),
        title: trophy.trophyName,
        //groupId: trophy.trophyGroupId
    };
};

//const rarityMap = {
//[TrophyRarity.VeryRare]: "Very Rare",
//[TrophyRarity.UltraRare]: "Ultra Rare",
//[TrophyRarity.Rare]: "Rare",
//[TrophyRarity.Common]: "Common"
//};