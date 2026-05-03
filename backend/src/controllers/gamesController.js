import axios from 'axios';
import gameImages from '../assets/landingPageURLs.js';
import config from "../config/env.js";
import { getGameTrailer } from "../config/youtube.js";
import redisClient from "../config/redis.js";
import logger from "../utils/logger.js";

const RAWG_API_KEY = config.RAWG_API_KEY;

// ── Shared axios client with 8s timeout ──────────────────────────────────────
const axiosClient = axios.create({ timeout: 8000 });

// ── Cache TTLs (seconds) ──────────────────────────────────────────────────────
const TTL_GAME_DETAILS = 3600;  // 1 hour
const TTL_LANDING_PAGE = 36000;   // 10 hour
const TTL_SEARCH = 300;   // 5 min

const formatRequirements = (req) => {
    if (!req) return null;
    return req
        // Strip common international labels for Minimum/Recommended
        .replace(/(?:Minimum|Recommended|Mínimo|Recomendados|Recomendado|Configuration minimale|Configuration recommandée|Mindestanforderungen|Empfohlen|システム要件|最低|推奨|Минимальные требования|Рекомендуемые требования|Requisiti minimi|Requisiti consigliati):/gi, '')
        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
        .replace(/<[^>]*>/g, '')      // Strip any other HTML tags
        .trim();
};

// ── Helper: safe Redis GET ────────────────────────────────────────────────────
async function cacheGet(key) {
    try {
        const val = await redisClient.get(key);
        if (val) {
            logger.debug({ key }, 'Cache HIT');
            return JSON.parse(val);
        }
    } catch (err) {
        logger.warn({ key, err }, 'Redis GET error');
    }
    return null;
}

// ── Helper: safe Redis SET ────────────────────────────────────────────────────
async function cacheSet(key, data, ttl) {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
        logger.debug({ key, ttl }, 'Cache SET');
    } catch (err) {
        logger.warn({ key, err }, 'Redis SET error');
    }
}

// @desc  get topselling games from Steam API
// @route  Get /games/topselling
export const getTopSellers = async (req, res, next) => {
    // ── Cache check ───────────────────────────────────────────────────────────
    const cacheKey = 'game:topsellers';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    try {
        const response = await axiosClient.get('https://store.steampowered.com/api/featuredcategories');

        if (response.status === 200) {
            if (!response.data || !response.data.top_sellers || !response.data.top_sellers.items) {
                const err = new Error('Top sellers data not found in response');
                err.status = 404;
                return next(err);
            }

            const formattedGames = response.data.top_sellers.items.map((game) => [
                game.header_image,
                `/games/${encodeURIComponent(game.name)}`,
            ]);

            await cacheSet(cacheKey, formattedGames, TTL_LANDING_PAGE);
            res.status(200).json(formattedGames);
        } else {
            const err = new Error('Failed to fetch top selling games from Steam API');
            err.status = response.status;
            next(err);
        }
    } catch (error) {
        next(error);
    }
};

// @desc  Get game details by ID (RAWG)
// @route  GET /games/:id
export const getOneGameDetails = async (req, res, next) => {
    const gameId = req.params.id;

    if (!gameId || gameId.trim() === '') {
        return next(new Error('Game ID is required'));
    }

    logger.debug({ gameId }, 'Received request for game details');

    // ── Cache check ───────────────────────────────────────────────────────────
    const cacheKey = `game:details:${gameId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    try {
        const { data } = await axiosClient.get(
            `https://api.rawg.io/api/games/${gameId}`,
            {
                params: { key: RAWG_API_KEY }
            }
        );

        // ✅ Stores
        const formattedStores =
            data.stores?.map(s => ({
                name: s.store.name,
                url: s.url
            })) || [];

        // ✅ Platforms
        const formattedPlatforms =
            data.platforms?.map(p => p.platform.name) || [];

        const gameProfile = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            description: data.description_raw || "No description available.",
            minimumreq: formatRequirements(
                data.platforms?.find(p => p.platform.slug === "pc")?.requirements?.minimum
            ),
            recommendedreq: formatRequirements(
                data.platforms?.find(p => p.platform.slug === "pc")?.requirements?.recommended
            ),
            released: data.released,
            image: data.background_image,
            metacritic: data.metacritic,
            playtime: data.playtime,
            developers: data.developers?.map(d => d.name) || [],
            publishers: data.publishers?.map(p => p.name) || [],
            genres: data.genres?.map(g => g.name) || [],
            stores: formattedStores,
            platforms: formattedPlatforms,
            itadId: null, // Added
            historyLow: null,
            deals: null,
            youtubeTrailer: null,
            rawgTrailer: null
        };

        // 🎬 YouTube Trailer
        try {
            const releaseYear = data.released ? data.released.split('-')[0] : '';
            gameProfile.youtubeTrailer = await getGameTrailer(`${data.name} official game trailer ${releaseYear}`.trim());
        } catch (err) {
            logger.warn({ err }, 'YouTube trailer fetch failed');
        }

        // 🎬 RAWG Trailer
        try {
            const moviesRes = await axiosClient.get(
                `https://api.rawg.io/api/games/${gameId}/movies`,
                { params: { key: RAWG_API_KEY } }
            );

            if (moviesRes.data?.results?.length > 0) {
                const rawgData = moviesRes.data.results[0].data;
                gameProfile.rawgTrailer = rawgData.max || rawgData[480] || null;
            }
        } catch (err) {
            logger.warn({ err }, 'RAWG trailer fetch failed');
        }

        // 💰 ITAD Integration (Production-Grade Matching)
        try {
            const ITAD_API_KEY = config.iTAD.apiKey;

            if (!ITAD_API_KEY) {
                logger.warn({ gameId }, 'No ITAD API key provided, skipping price data');
            } else {

                // 🔍 Search ITAD
                const searchRes = await axiosClient.get(
                    "https://api.isthereanydeal.com/games/search/v1",
                    {
                        params: {
                            key: ITAD_API_KEY,
                            title: data.name,
                            results: 10
                        }
                    }
                );

                if (searchRes.data?.length > 0) {

                    // 🧠 Normalize titles (advanced)
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/\(.*?\)/g, '') // remove (2023), (Remake)
                            .replace(/\b(game of the year|goty|edition|complete|bundle|definitive|remastered|redux)\b/g, '')
                            .replace(/[^a-z0-9]/g, '');
                    };

                    const rawgName = normalize(data.name);
                    const rawgSlug = normalize(data.slug || "");

                    // 🎯 Scoring function (weighted)
                    const scoreMatch = (a, b) => {
                        if (!a || !b) return 0;

                        if (a === b) return 100;

                        if (a.includes(b) || b.includes(a)) return 90;

                        let matches = 0;
                        for (let i = 0; i < Math.min(a.length, b.length); i++) {
                            if (a[i] === b[i]) matches++;
                        }

                        const baseScore = (matches / Math.max(a.length, b.length)) * 100;

                        return baseScore;
                    };

                    // 🧠 Find BEST match with slug boost
                    let bestMatch = null;
                    let bestScore = 0;

                    for (const g of searchRes.data) {
                        const itadName = normalize(g.title);

                        let score = scoreMatch(itadName, rawgName);

                        // 🚀 BOOST if matches slug
                        if (rawgSlug && itadName.includes(rawgSlug)) {
                            score += 10;
                        }

                        // 🚀 Slight penalty for too long titles (often bundles/DLC)
                        if (itadName.length > rawgName.length * 1.5) {
                            score -= 5;
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = g;
                        }
                    }

                    // 🎯 Threshold
                    const MATCH_THRESHOLD = 65;

                    let selectedGame = null;

                    if (bestMatch && bestScore >= MATCH_THRESHOLD) {
                        logger.debug({ title: bestMatch.title, score: bestScore }, 'Best ITAD match found');
                        selectedGame = bestMatch;
                    } else {
                        logger.debug({ gameName: data.name }, 'No strong ITAD match, skipping deals');
                        selectedGame = null;
                    }

                    if (selectedGame) {
                        gameProfile.itadId = selectedGame.id;
                        logger.debug({ itadId: gameProfile.itadId }, 'ITAD ID resolved');
                        // 💰 Fetch prices
                        const pricesRes = await axiosClient.post(
                            "https://api.isthereanydeal.com/games/prices/v3",
                            [selectedGame.id],
                            {
                                params: {
                                    key: ITAD_API_KEY,
                                    country: "US"
                                }
                            }
                        );

                        if (pricesRes.data?.length > 0) {
                            const priceData = pricesRes.data[0];

                            // 📉 History Low
                            if (priceData.historyLow) {
                                gameProfile.historyLow = {
                                    all: priceData.historyLow.all?.amount ?? null,
                                    y1: priceData.historyLow.y1?.amount ?? null,
                                    m3: priceData.historyLow.m3?.amount ?? null,
                                };
                            }

                            // 🏷 Deals (with filtering)
                            if (priceData.deals?.length > 0) {
                                gameProfile.deals = priceData.deals.map(deal => ({
                                    store: deal.shop?.name || "Unknown",
                                    price: deal.price?.amount ?? null,
                                    storeLow: deal.storeLow?.amount ?? null,
                                    url: deal.url
                                }));
                            }
                        }
                    }
                }
            }
        } catch (itadErr) {
            logger.error({ err: itadErr }, 'ITAD fetch failed');
        }

        // ── Store full profile in cache ───────────────────────────────────────
        await cacheSet(cacheKey, gameProfile, TTL_GAME_DETAILS);

        return res.json(gameProfile);

    } catch (error) {
        error.logContext = { gameId };
        next(error);
    }
};

// @desc  get landing page game images
// @route  GET /games/landingpage
export const getLandingPageImages = async (req, res, next) => {
    // ── Cache check ───────────────────────────────────────────────────────────
    const cacheKey = 'game:landingpage';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    try {
        const response = await axiosClient.get(`https://api.rawg.io/api/games`, {
            params: {
                ordering: '-added',
                page_size: 20,
                key: RAWG_API_KEY
            }
        });
        const results = response.data.results;
        await cacheSet(cacheKey, results, TTL_LANDING_PAGE);
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
}

// @desc  search games by query (RAWG)
// @route  GET /games/search
export const searchGames = async (req, res, next) => {
    const query = req.query.q;

    if (!query || query.trim() === '') {
        return res.status(200).json([]); // Return empty list if no query
    }

    // ── Cache check ───────────────────────────────────────────────────────────
    const cacheKey = `game:search:${query.trim().toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    try {
        logger.debug({ query }, 'Game search request');
        const response = await axiosClient.get(`https://api.rawg.io/api/games?search=${query}&key=${RAWG_API_KEY}&page_size=20`);

        if (response.status === 200) {
            const results = response.data.results.map(game => ({
                id: game.id,
                name: game.name,
                image: game.background_image,
                rating: game.rating,
                genres: game.genres?.map(g => g.name) || [],
                released: game.released ? game.released.split('-')[0] : 'N/A'
            }));
            await cacheSet(cacheKey, results, TTL_SEARCH);
            res.status(200).json(results);
        } else {
            next(new Error('Failed to fetch search results from RAWG'));
        }
    } catch (error) {
        error.logContext = { query };
        next(error);
    }
};


//! it itsnt used by default it insteads fetches the data from the gamepage already fetched
// @desc  Get available stores for a game (ITAD)
// @route  GET /games/stores/:id
export const getGameStores = async (req, res) => {
    const itadId = req.params.itadId;
    const ITAD_API_KEY = config.iTAD.apiKey;

    if (!itadId) {
        return res.status(400).json({ message: "ITAD ID is required" });
    }

    if (!ITAD_API_KEY) {
        return res.status(200).json({ stores: [] });
    }

    const cacheKey = `game:stores:${itadId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    try {
        const pricesRes = await axiosClient.post(
            "https://api.isthereanydeal.com/games/prices/v3",
            [itadId],
            {
                params: {
                    key: ITAD_API_KEY,
                    country: "US"
                }
            }
        );

        if (pricesRes.data?.length > 0) {
            const deals = pricesRes.data[0].deals || [];

            const stores = [
                ...new Set(
                    deals
                        .map(d => d.shop?.name)
                        .filter(Boolean)
                )
            ].sort();

            const result = { stores };

            await cacheSet(cacheKey, result, TTL_SEARCH);

            return res.status(200).json(result);
        }

        return res.status(200).json({ stores: [] });

    } catch (error) {
        logger.error({ err: error, itadId }, 'ITAD stores fetch failed');
        return res.status(200).json({ stores: [] });
    }
};

// @desc  Get price history for a game (ITAD)
// @route  GET /games/pricehistory/:itadId
export const getPriceHistory = async (req, res, next) => {
    const { itadId } = req.params;
    const ITAD_API_KEY = config.iTAD.apiKey;

    if (!itadId) {
        return res.status(400).json({ message: "ITAD ID is required" });
    }

    if (!ITAD_API_KEY) {
        return res.status(200).json({ history: [] });
    }

    const cacheKey = `game:pricehistory:${itadId}`;
    const TTL_HISTORY = 21600; // 6 hours
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    try {
        const historyRes = await axiosClient.get(
            "https://api.isthereanydeal.com/games/history/v2",
            {
                params: {
                    key: ITAD_API_KEY,
                    id: itadId,
                    country: "US",
                    since: "2024-01-01T00:00:00Z"
                }
            }
        );

        // ITAD history/v2 returns an array of deal events
        const raw = historyRes.data || [];

        const allPoints = [];
        for (const entry of raw) {
            const shopName = entry.shop?.name || "Unknown";
            const deal = entry.deal || {};
            const timestampStr = entry.timestamp;

            if (timestampStr && deal.price?.amount != null) {
                // ITAD returns ISO string timestamps like "2026-04-24T09:09:16+02:00"
                const ms = new Date(timestampStr).getTime();
                allPoints.push({
                    timestamp: ms, // Store as ms
                    price: deal.price.amount,
                    store: shopName,
                    regular: deal.regular?.amount ?? null
                });
            }
        }

        // Sort by timestamp ascending
        allPoints.sort((a, b) => a.timestamp - b.timestamp);

        // Build per-store series for charting
        const seriesMap = {};
        for (const point of allPoints) {
            if (!seriesMap[point.store]) seriesMap[point.store] = [];
            seriesMap[point.store].push({
                t: point.timestamp, // Already in ms
                price: point.price,
                regular: point.regular
            });
        }

        const result = {
            history: allPoints,
            series: seriesMap
        };

        await cacheSet(cacheKey, result, TTL_HISTORY);
        return res.status(200).json(result);

    } catch (error) {
        logger.error({ err: error, itadId }, 'ITAD price history fetch failed');
        return res.status(200).json({ history: [], series: {} });
    }
};