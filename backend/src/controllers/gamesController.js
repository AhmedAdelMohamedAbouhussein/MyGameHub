import axios from 'axios';
import gameImages from '../assets/landingPageURLs.js';
import config from "../config/env.js";
import { getGameTrailer } from "../config/youtube.js";
import redisClient from "../config/redis.js";
import logger from "../utils/logger.js";

const RAWG_API_KEY = config.RAWG_API_KEY;

// ── Shared axios client with 5s timeout ──────────────────────────────────────
const axiosClient = axios.create({ timeout: 5000 });

// ── Cache TTLs (seconds) ──────────────────────────────────────────────────────
const TTL_GAME_DETAILS = 3600;  // 1 hour
const TTL_LANDING_PAGE = 36000;   // 10 hour
const TTL_SEARCH = 300;   // 5 min

const formatRequirements = (req) => {
    if (!req) return null;

    let text = req
        .replace(/(?:Minimum|Recommended|Mínimo|Recomendados|Recomendado|Configuration minimale|Configuration recommandée|Mindestanforderungen|Empfohlen|システム要件|最低|推奨|Минимальные требования|Рекомендуемые требования|Requisiti minimi|Requisiti consigliati):/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();

    // 🌍 Simple Technical Translation Dictionary
    const dictionary = {
        "Prozessor": "Processor",
        "Arbeitsspeicher": "Memory",
        "Grafik": "Graphics",
        "Speicherplatz": "Storage",
        "Betriebssystem": "OS",
        "Memoria": "Memory",
        "Gráficos": "Graphics",
        "Almacenamiento": "Storage",
        "Sistema operativo": "OS",
        "Mémoire vive": "Memory",
        "Carte graphique": "Graphics",
        "Espace disque": "Storage",
        "Système d'exploitation": "OS",
        "Процессор": "Processor",
        "Память": "Memory",
        "Видеокарта": "Graphics",
        "Место на диске": "Storage",
        "ОС": "OS",
    };

    Object.keys(dictionary).forEach(key => {
        const regex = new RegExp(key, 'gi');
        text = text.replace(regex, dictionary[key]);
    });

    return text;
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

// ── ITAD enrichment helper ──────────────────────────────────────────────────────
// Mutates `profile` in place: sets itadId, historyLow, deals.
// Called from both the normal RAWG flow and the Steam fallback so pricing works either way.
async function enrichWithITAD(profile, gameName, gameSlug = '') {
    const ITAD_API_KEY = config.iTAD.apiKey;
    if (!ITAD_API_KEY || !gameName) return;

    try {
        // 🔍 Search ITAD by name
        const searchRes = await axiosClient.get(
            'https://api.isthereanydeal.com/games/search/v1',
            { params: { key: ITAD_API_KEY, title: gameName, results: 10 } }
        );
        if (!searchRes.data?.length) return;

        // 🧠 Normalize + fuzzy-score titles
        const normalize = (str) =>
            str.toLowerCase()
                .replace(/\(.*?\)/g, '')
                .replace(/\b(game of the year|goty|edition|complete|bundle|definitive|remastered|redux)\b/g, '')
                .replace(/[^a-z0-9]/g, '');

        const normName = normalize(gameName);
        const normSlug = normalize(gameSlug);

        const scoreMatch = (a, b) => {
            if (!a || !b) return 0;
            if (a === b) return 100;
            if (a.includes(b) || b.includes(a)) return 90;
            let matches = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                if (a[i] === b[i]) matches++;
            }
            return (matches / Math.max(a.length, b.length)) * 100;
        };

        let bestMatch = null, bestScore = 0;
        for (const g of searchRes.data) {
            const itadName = normalize(g.title);
            let score = scoreMatch(itadName, normName);
            if (normSlug && itadName.includes(normSlug)) score += 10;
            if (itadName.length > normName.length * 1.5) score -= 5;
            if (score > bestScore) { bestScore = score; bestMatch = g; }
        }

        if (!bestMatch || bestScore < 65) {
            logger.debug({ gameName }, 'No strong ITAD match, skipping deals');
            return;
        }

        logger.debug({ title: bestMatch.title, score: bestScore }, 'Best ITAD match found');
        profile.itadId = bestMatch.id;

        // 💰 Fetch prices
        const pricesRes = await axiosClient.post(
            'https://api.isthereanydeal.com/games/prices/v3',
            [bestMatch.id],
            { params: { key: ITAD_API_KEY, country: 'US' } }
        );
        if (!pricesRes.data?.length) return;

        const priceData = pricesRes.data[0];

        if (priceData.historyLow) {
            profile.historyLow = {
                all: priceData.historyLow.all?.amount ?? null,
                y1: priceData.historyLow.y1?.amount ?? null,
                m3: priceData.historyLow.m3?.amount ?? null,
            };
        }
        if (priceData.deals?.length > 0) {
            profile.deals = priceData.deals.map(deal => ({
                store: deal.shop?.name || 'Unknown',
                price: deal.price?.amount ?? null,
                storeLow: deal.storeLow?.amount ?? null,
                url: deal.url
            }));
        }
    } catch (err) {
        logger.error({ message: err.message, status: err.response?.status }, 'ITAD enrichment failed');
    }
}

// @desc  Get game details by ID (RAWG)
// @route  GET /games/:id
export const getOneGameDetails = async (req, res, next) => {
    const gameId = req.params.id;
    const gameName = req.query.name; // Optional: sent by frontend as name fallback

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
        let formattedStores =
            data.stores?.map(s => ({
                storeId: s.store.id,
                name: s.store.name,
                url: s.url
            })) || [];

        try {
            const storesRes = await axiosClient.get(`https://api.rawg.io/api/games/${gameId}/stores`, { params: { key: RAWG_API_KEY } });
            if (storesRes.data?.results) {
                storesRes.data.results.forEach(realStore => {
                    const match = formattedStores.find(fs => fs.storeId === realStore.store_id);
                    if (match && realStore.url) {
                        match.url = realStore.url;
                    }
                });
            }
        } catch (err) {
            logger.warn({ err }, 'RAWG real store URLs fetch failed');
        }

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

        // 💰 ITAD enrichment (price data, deals, history low)
        await enrichWithITAD(gameProfile, data.name, data.slug);

        // ── Store full profile in cache ───────────────────────────────────────
        await cacheSet(cacheKey, gameProfile, TTL_GAME_DETAILS);

        return res.json(gameProfile);

    } catch (error) {
        const isRawgDown = !error.response || error.response.status >= 500;
        const isWrongId = error.response?.status === 404;

        // ── Steam fallback: triggered when RAWG is down OR the ID is invalid ──
        if ((isRawgDown || isWrongId) && gameName) {
            logger.warn({ gameId, gameName }, 'RAWG unavailable for game details – trying Steam fallback');
            try {
                // Run Steam search + ITAD + YouTube in parallel (all only need the name)
                const itadData = {};
                const [searchRes, , youtubeTrailer] = await Promise.all([
                    axiosClient.get(
                        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`
                    ),
                    enrichWithITAD(itadData, gameName),                            // mutates itadData
                    getGameTrailer(`${gameName} official game trailer`).catch(() => null) // swallow YouTube errors
                ]);
                const steamAppId = searchRes.data?.items?.[0]?.id;

                if (steamAppId) {
                    // Fetch full Steam app details (needs steamAppId from storesearch)
                    const detailsRes = await axiosClient.get(
                        `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=us&l=en`
                    );
                    const sd = detailsRes.data?.[steamAppId]?.data;

                    if (sd) {
                        const stripHtml = (str) => str?.replace(/<[^>]*>/g, '').trim() || null;

                        const fallbackProfile = {
                            id: sd.steam_appid || steamAppId,
                            name: sd.name,
                            slug: null,
                            description: sd.short_description || 'No description available.',
                            minimumreq: stripHtml(sd.pc_requirements?.minimum),
                            recommendedreq: stripHtml(sd.pc_requirements?.recommended),
                            released: sd.release_date?.date || null,
                            image: `https://steamcdn-a.akamaihd.net/steam/apps/${steamAppId}/library_600x900_2x.jpg`,
                            metacritic: sd.metacritic?.score || null,
                            playtime: null,
                            developers: sd.developers || [],
                            publishers: sd.publishers || [],
                            genres: sd.genres?.map(g => g.description) || [],
                            stores: [{
                                storeId: 1,
                                name: 'Steam',
                                url: `https://store.steampowered.com/app/${steamAppId}`
                            }],
                            platforms: Object.entries(sd.platforms || {})
                                .filter(([, v]) => v)
                                .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
                            // All fetched in parallel above — no extra latency
                            itadId:       itadData.itadId    ?? null,
                            historyLow:   itadData.historyLow ?? null,
                            deals:        itadData.deals      ?? null,
                            youtubeTrailer: youtubeTrailer    ?? null,
                            rawgTrailer:  null, // RAWG-exclusive, unavailable in fallback
                        };

                        await cacheSet(cacheKey, fallbackProfile, 120);
                        return res.json(fallbackProfile);
                    }
                }
            } catch (steamErr) {
                logger.warn({ err: steamErr.message, gameName }, 'Steam fallback for game details also failed');
            }
        }

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
        // ── RAWG is unavailable (timeout, 5xx, etc.) – serve local fallback ──
        logger.warn({ err: error.message }, 'RAWG unavailable for landing page – using local fallback assets');
        if (gameImages && gameImages.length > 0) {
            return res.status(200).json(gameImages);
        }
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
        // ── RAWG unavailable – fall back to Steam Store Search API ───────────
        logger.warn({ err: error.message, query }, 'RAWG unavailable for search – falling back to Steam Store Search');
        try {
            const steamRes = await axiosClient.get(
                `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
            );
            const steamItems = steamRes.data?.items || [];
            if (steamItems.length > 0) {
                const fallback = steamItems.map(g => ({
                    id: g.id,
                    name: g.name,
                    image: `https://steamcdn-a.akamaihd.net/steam/apps/${g.id}/library_600x900_2x.jpg`,
                    rating: null,
                    genres: [],
                    released: 'N/A'
                }));
                await cacheSet(cacheKey, fallback, 120); // short TTL so RAWG data refreshes quickly
                return res.status(200).json(fallback);
            }
        } catch (steamError) {
            logger.warn({ err: steamError.message, query }, 'Steam Store Search also failed');
        }
        // Both APIs down — return empty so frontend shows its empty state gracefully
        return res.status(200).json([]);
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
        logger.error({
            message: error.message,
            status: error.response?.status,
            itadId
        }, 'ITAD stores fetch failed');
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
                    since: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('.')[0] + "Z"
                }
            }
        );

        const raw = historyRes.data || [];
        const allPoints = [];

        for (const entry of raw) {
            const shopName = entry.shop?.name || "Unknown";
            const deal = entry.deal || {};
            const timestampStr = entry.timestamp;

            if (timestampStr && deal.price?.amount != null) {
                const ms = new Date(timestampStr).getTime();
                allPoints.push({
                    timestamp: ms,
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
        logger.error({
            message: error.message,
            status: error.response?.status,
            itadId
        }, 'ITAD price history fetch failed');
        return res.status(200).json({ history: [], series: {} });
    }
};