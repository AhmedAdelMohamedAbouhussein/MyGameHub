import User from '../../../models/User.js';
import axios from 'axios';
import config from '../../../config/env.js';
import redisClient from '../../../config/redis.js';
import logger from '../../../utils/logger.js';
import { hashId } from '../../../utils/logSanitize.js';

const RAWG_API_KEY = config.RAWG_API_KEY;
const ITAD_API_KEY = config.iTAD.apiKey;

// Helper to fetch ITAD pricing for multiple games in one call
async function fetchBatchPrices(itadIds, country = "US") {
    if (!ITAD_API_KEY || !itadIds || itadIds.length === 0) return {};

    try {
        const pricesRes = await axios.post("https://api.isthereanydeal.com/games/prices/v3", itadIds, {
            params: { key: ITAD_API_KEY, country }
        });

        const priceMap = {};
        if (pricesRes.data) {
            pricesRes.data.forEach(gamePrice => {
                priceMap[gamePrice.id] = {
                    deals: gamePrice.deals || [],
                    historyLow: gamePrice.historyLow || null
                };
            });
        }
        return priceMap;
    } catch (err) {
        logger.error({ err }, '[Wishlist] Batch ITAD fetch failed');
        return {};
    }
}

// Helper to fetch ITAD pricing for a single game (used during add/toggle)
async function fetchCurrentPrice(gameName, targetStores = [], itadId = null) {
    if (!ITAD_API_KEY) return null;

    try {
        let selectedId = itadId;

        // If no itadId provided, search by name
        if (!selectedId) {
            const searchRes = await axios.get("https://api.isthereanydeal.com/games/search/v1", {
                params: { key: ITAD_API_KEY, title: gameName, results: 1 }
            });
            if (searchRes.data?.length > 0) {
                selectedId = searchRes.data[0].id;
            }
        }

        if (selectedId) {
            const priceMap = await fetchBatchPrices([selectedId]);
            const gamePriceData = priceMap[selectedId] || { deals: [] };
            const deals = gamePriceData.deals || [];

            return {
                itadId: selectedId,
                allDeals: deals.map(d => ({
                    store: d.shop?.name,
                    price: d.price?.amount,
                    url: d.url
                }))
            };
        }
    } catch (err) {
        logger.error({ err, gameName }, '[Wishlist] ITAD fetch failed');
    }
    return null;
}

export const toggleWishlist = async (req, res, next) => {
    const { gameId, gameName, targetStores, itadId, action } = req.body;
    const userId = req.session.userId;

    logger.debug({ action, gameId, gameName }, '[Wishlist] Toggle request');

    if (!gameId) return res.status(400).json({ message: "Game ID is required" });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const gameIdStr = String(gameId);
        const index = user.wishlist.findIndex(item => item.gameId === gameIdStr);

        // Explicit Remove
        if (action === "remove" || (index > -1 && !action && !targetStores)) {
            if (index > -1) {
                user.wishlist.splice(index, 1);
                await user.save();
                return res.status(200).json({ message: "Removed from wishlist", inWishlist: false });
            }
            return res.status(404).json({ message: "Game not in wishlist" });
        }

        // Add or Update
        const priceInfo = await fetchCurrentPrice(gameName, targetStores, itadId);
        const effectiveItadId = itadId || (priceInfo ? priceInfo.itadId : null);

        // Map current deals to storePrices structure
        const storePrices = (targetStores || []).map(storeName => {
            const deal = priceInfo?.allDeals?.find(d => d.store === storeName);
            return {
                storeName,
                initialPrice: deal ? deal.price : null,
                lastNotifiedPrice: deal ? deal.price : null
            };
        });

        if (index > -1) {
            // Update existing
            user.wishlist[index].targetStores = targetStores || [];
            user.wishlist[index].storePrices = storePrices;
            if (effectiveItadId) user.wishlist[index].itadId = effectiveItadId;

            await user.save();
            return res.status(200).json({
                message: "Wishlist preferences updated",
                inWishlist: true,
                itadId: effectiveItadId
            });
        } else {
            // Add new
            user.wishlist.push({
                gameId: gameIdStr,
                itadId: effectiveItadId,
                gameName: gameName,
                targetStores: targetStores || [],
                storePrices: storePrices
            });

            await user.save();
            return res.status(200).json({
                message: "Added to wishlist",
                inWishlist: true,
                itadId: effectiveItadId
            });
        }
    } catch (error) {
        error.logContext = { userId: hashId(userId) };
        next(error);
    }
};

export const getWishlist = async (req, res, next) => {
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.wishlist || user.wishlist.length === 0) {
            return res.status(200).json({ wishlist: [] });
        }

        // 1. Collect all ITAD IDs for batch fetching and Redis keys
        const itadIds = user.wishlist.map(item => item.itadId).filter(id => !!id);
        const cacheKeys = user.wishlist.map(item => `game:wishlist:${item.gameId}`);

        // 2. Parallel fetch: Prices from ITAD and Details from Redis
        const [priceMap, cachedDetails] = await Promise.all([
            fetchBatchPrices(itadIds),
            redisClient.mGet(cacheKeys)
        ]);

        // 3. Build wishlist with cached details and live prices
        const wishlistWithDetails = await Promise.all(user.wishlist.map(async (item, index) => {
            let details = null;
            const cached = cachedDetails[index];

            if (cached) {
                try {
                    details = JSON.parse(cached);
                } catch (err) { }
            }

            if (!details) {
                const cacheKey = cacheKeys[index];
                try {
                    const { data } = await axios.get(`https://api.rawg.io/api/games/${item.gameId}?key=${RAWG_API_KEY}`);
                    details = {
                        id: data.id,
                        name: data.name,
                        image: data.background_image,
                        slug: data.slug,
                        metacritic: data.metacritic
                    };
                    await redisClient.setEx(cacheKey, 3600, JSON.stringify(details));
                } catch (err) {
                    details = { id: item.gameId, name: item.gameName || "Unknown Game" };
                }
            }

            // Get live data for this game from our batch result
            const liveData = priceMap[item.itadId] || { deals: [], historyLow: null };
            const allDeals = liveData.deals;

            // Enrich storePrices with live data
            const enrichedStorePrices = item.storePrices.map(sp => {
                const liveDeal = allDeals.find(d => d.shop?.name === sp.storeName);
                return {
                    ...sp.toObject(),
                    currentPrice: liveDeal ? liveDeal.price?.amount : null,
                    url: liveDeal ? liveDeal.url : null,
                    isHistoryLow: liveData.historyLow && liveDeal ? (liveDeal.price?.amount <= liveData.historyLow.price?.amount) : false
                };
            });

            // Find the best overall price among target stores for the main display
            let relevantDeals = allDeals;
            if (item.targetStores && item.targetStores.length > 0) {
                relevantDeals = allDeals.filter(d => item.targetStores.includes(d.shop?.name));
            }

            relevantDeals.sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0));
            const bestDeal = relevantDeals[0];

            return {
                ...details,
                targetStores: item.targetStores,
                storePrices: enrichedStorePrices,
                historyLow: liveData.historyLow,
                currentPrice: bestDeal ? bestDeal.price?.amount : null,
                store: bestDeal ? bestDeal.shop?.name : null,
                url: bestDeal ? bestDeal.url : null,
                addedAt: item.addedAt,
                itadId: item.itadId
            };
        }));

        res.status(200).json({ wishlist: wishlistWithDetails.filter(i => i !== null) });
    } catch (error) {
        error.logContext = { userId: hashId(userId) };
        next(error);
    }
};

export const checkWishlistStatus = async (req, res, next) => {
    const { gameId } = req.params;
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const item = user.wishlist.find(i => i.gameId === String(gameId));
        res.status(200).json({
            inWishlist: !!item,
            targetStores: item ? item.targetStores : []
        });
    } catch (error) {
        next(error);
    }
};
