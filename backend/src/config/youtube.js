import axios from "axios";
import config from "./env.js";
import redisClient from "./redis.js";
import logger from "../utils/logger.js";

const TRAILER_TTL = 3600; // 1 hour

export async function getGameTrailer(gameName) {
    const cacheKey = `yt:trailer:${gameName.toLowerCase().replace(/\s+/g, '_')}`;

    // ── Cache check ──────────────────────────────────────────────────
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            logger.debug({ cacheKey }, '[YouTube] Cache HIT');
            return JSON.parse(cached);
        }
    } catch (cacheErr) {
        logger.warn({ err: cacheErr }, '[YouTube] Redis GET failed');
    }

    // ── YouTube API call ─────────────────────────────────────────────
    try {
        const res = await axios.get(
            "https://www.googleapis.com/youtube/v3/search",
            {
                timeout: 10000,
                params: {
                    key: config.google.youtubeApiKey,
                    q: `${gameName} game official trailer`,
                    part: "snippet",
                    maxResults: 1,
                    type: "video"
                }
            }
        );

        const video = res.data?.items?.[0];
        if (!video) return null;

        const result = {
            videoId: video.id.videoId,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails?.high?.url
        };

        // ── Store in cache ───────────────────────────────────────────
        try {
            await redisClient.setEx(cacheKey, TRAILER_TTL, JSON.stringify(result));
            logger.debug({ cacheKey, ttl: TRAILER_TTL }, '[YouTube] Cache SET');
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, '[YouTube] Redis SET failed');
        }

        return result;
    }
    catch (err) {
        logger.error({ err }, '[YouTube] Trailer fetch failed');
        return null;
    }
}