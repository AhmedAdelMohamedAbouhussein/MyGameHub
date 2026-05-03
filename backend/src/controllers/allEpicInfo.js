import axios from "axios";
import pLimit from "p-limit";
import http from "http";
import https from "https";
import { uploadImageFromUrl } from "../utils/imageUpload.js";

// Concurrency limits
const FRIENDS_CONCURRENCY = 5;
const friendsLimit = pLimit(FRIENDS_CONCURRENCY);

// Shared agent for performance
const agent = {
    http: new http.Agent({ keepAlive: true, timeout: 8000 }),
    https: new https.Agent({ keepAlive: true, timeout: 8000 })
};

const axiosClient = axios.create({
    httpAgent: agent.http,
    httpsAgent: agent.https,
    timeout: 10000,
});

/**
 * Fetch Epic friends using modern EOS v2 APIs
 * Scope: basic_profile, friends_list
 */
export async function getUserFriendList(accessToken, accountId, existingFriends = []) {
    try {
        // 1. Get friend IDs (v1 modern)
        const friendsRes = await axiosClient.get(
            `https://api.epicgames.dev/epic/friends/v1/${accountId}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        const friendIds = (friendsRes.data?.friends || []).map(f => f.accountId);
        if (!friendIds.length) return [];

        // 2. Batch account profiles (v2 modern, 50 per request)
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 50) {
            chunks.push(friendIds.slice(i, i + 50));
        }

        const profileRequests = chunks.map(chunk =>
            friendsLimit(async () => {
                const query = chunk.map(id => `accountId=${id}`).join("&");
                const res = await axiosClient.get(
                    `https://api.epicgames.dev/epic/id/v2/accounts?${query}`,
                    {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    }
                );
                return res.data || [];
            })
        );

        const profiles = (await Promise.all(profileRequests)).flat();

        // 3. Format result and process friends
        const result = profiles.map(p => ({
            externalId: p.accountId,
            displayName: p.displayName,
            profileUrl: `https://www.epicgames.com/id/u/${p.accountId}`,
            avatar: null,
            originalAvatarUrl: null,
            status: "accepted",
            source: "Epic"
        }));

        return result;

    } catch (error) {
        console.error("Epic friends fetch failed:", error.response?.data || error.message);
        return [];
    }
}