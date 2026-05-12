import userModel from "../../../models/User.js";
import UserGame from "../../../models/UserGame.js";
import Friendship from "../../../models/Friendship.js";

/**
 * @desc    Get a user's public profile and stats
 * @route   GET /api/users/profile/:handle
 * @access  Public (Partial data if private)
 */
export const getPublicProfile = async (req, res, next) => {
    try {
        // Accept profileHandle (preferred) OR legacy publicID
        const param = decodeURIComponent(req.params.handle).trim();
        let currentUserPublicID = null;

        if (req.session?.userId) {
            const currentUser = await userModel.findById(req.session.userId);
            currentUserPublicID = currentUser?.publicID;
        }

        // Try profileHandle first (case-insensitive), then fall back to publicID (case-insensitive)
        let targetUser = await userModel.findOne({ 
            profileHandle: { $regex: new RegExp(`^${param}$`, 'i') } 
        });
        if (!targetUser) {
            targetUser = await userModel.findOne({ 
                publicID: { $regex: new RegExp(`^${param}$`, 'i') } 
            });
        }

        if (!targetUser || targetUser.isDeleted) {
            return res.status(404).json({ message: "User not found" });
        }

        // Basic Profile Info
        const profile = {
            name: targetUser.name,
            publicID: targetUser.publicID,
            bio: targetUser.bio,
            profilePicture: targetUser.profilePicture,
            profileVisibility: targetUser.profileVisibility,
            allowPublicFriendRequests: targetUser.allowPublicFriendRequests !== false, // default true
            profileBackground: targetUser.profileBackground || null,
            themeSongId: targetUser.themeSongId || null,
            masterpieceGame: targetUser.masterpieceGame || null,
            signupDate: targetUser.signupDate,
            isLiked: targetUser.likes?.includes(currentUserPublicID),
            likesCount: targetUser.likes?.length || 0,
            friendsCount: 0,
            totalGames: 0,
            totalHours: 0,
            topGames: [],
            favoriteGames: [],
            friendshipStatus: "none" // none, pending, accepted, requested_by_target
        };

        // Calculate Friend Count (Normalized)
        profile.friendsCount = await Friendship.countDocuments({ 
            userId: targetUser._id, 
            status: "accepted" 
        });

        // Check Relationship Status with viewer
        if (currentUserPublicID) {
            const relationship = await Friendship.findOne({
                userId: targetUser._id,
                source: "User",
                friendUserPublicID: currentUserPublicID
            });
            if (relationship) {
                if (relationship.status === "accepted") {
                    profile.friendshipStatus = "accepted";
                } else if (relationship.status === "pending") {
                    profile.friendshipStatus = relationship.requestedByMe ? "requested_by_target" : "pending";
                }
            }
        }

        // Privacy Check: Only show stats if public or if they are friends
        const isSelf = currentUserPublicID === targetUser.publicID;
        const isFriend = profile.friendshipStatus === "accepted";
        const canSeeStats = targetUser.profileVisibility === "public" || isFriend || isSelf;

        if (canSeeStats) {
            const unifiedGames = new Map();
            const ownedGames = await UserGame.find({ userId: targetUser._id });

            for (const game of ownedGames) {
                const gameName = game.gameName || "Unknown Game";
                const key = gameName.toLowerCase().trim();

                // Parse hours from "Xh Ym Zs"
                let hoursNum = 0;
                if (game.totalHours) {
                    const match = game.totalHours.match(/(\d+)h/);
                    if (match) hoursNum = parseInt(match[1]);
                }

                if (unifiedGames.has(key)) {
                    const existing = unifiedGames.get(key);
                    existing.hoursPlayed += hoursNum;
                    existing.progress = Math.max(existing.progress, game.maxProgress || 0);
                } else {
                    unifiedGames.set(key, {
                        gameName: gameName,
                        coverImage: game.coverImage,
                        platform: game.platform,
                        hoursPlayed: hoursNum,
                        progress: game.maxProgress || 0
                    });
                }
            }

            const allGames = Array.from(unifiedGames.values());
            profile.totalGames = allGames.length;
            profile.totalHours = allGames.reduce((acc, g) => acc + g.hoursPlayed, 0);

            // Most played games: sort by hours first, fall back to progress if hours are tied (e.g. all 0)
            profile.mostPlayedGames = [...allGames]
                .sort((a, b) => b.hoursPlayed - a.hoursPlayed || b.progress - a.progress)
                .slice(0, 6);

            // 100% completed games — return ALL of them
            const completedGames = allGames.filter(g => g.progress >= 100);
            profile.completedGames = completedGames
                .sort((a, b) => b.hoursPlayed - a.hoursPlayed);
            profile.completedGamesCount = completedGames.length;

            // Completion rate
            profile.completionRate = allGames.length > 0
                ? Math.round((completedGames.length / allGames.length) * 100)
                : 0;

            // Keep topGames for backwards compat
            profile.topGames = profile.mostPlayedGames;

            // Populate favoriteGames
            if (targetUser.favoriteGames && targetUser.favoriteGames.length > 0) {
                profile.favoriteGames = targetUser.favoriteGames;
            }
        }

        // Security: strip publicID from the response if the user has disabled friend requests
        // and the viewer is neither a friend nor the profile owner.
        // Use profile.allowPublicFriendRequests (normalized via !== false on line 42) NOT the raw
        // targetUser field, which can be `undefined` on older accounts — !undefined === true
        // would incorrectly strip publicID from users who never explicitly disabled friend requests.
        if (!profile.allowPublicFriendRequests && !isFriend && !isSelf) {
            delete profile.publicID;
        }

        res.status(200).json({ profile });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle like on a profile
 * @route   POST /api/users/profile/:publicID/like
 * @access  Private
 */
export const toggleLike = async (req, res, next) => {
    try {
        const param = decodeURIComponent(req.params.publicID).trim();

        let currentUserPublicID = null;
        if (req.session?.userId) {
            const currentUser = await userModel.findById(req.session.userId);
            currentUserPublicID = currentUser?.publicID;
        }

        if (!currentUserPublicID) {
            return res.status(401).json({ message: "Unable to identify user session." });
        }

        // Accept profileHandle OR legacy publicID
        let targetUser = await userModel.findOne({ profileHandle: param });
        if (!targetUser) {
            targetUser = await userModel.findOne({ publicID: param });
        }
        if (param === currentUserPublicID) {
            return res.status(400).json({ message: "You cannot like your own profile" });
        }

        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const likeIndex = targetUser.likes.indexOf(currentUserPublicID);
        let message = "";

        if (likeIndex === -1) {
            targetUser.likes.push(currentUserPublicID);
            message = "Profile liked!";
        } else {
            targetUser.likes.splice(likeIndex, 1);
            message = "Profile unliked!";
        }

        await targetUser.save();
        res.status(200).json({ message, likesCount: targetUser.likes.length });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get global community users (top accounts)
 * @route   GET /api/users/community/all
 * @access  Public
 */
export const getCommunityUsers = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = { profileVisibility: "public", isDeleted: false };

        if (search) {
            if (typeof search !== 'string') {
                return res.status(400).json({ message: "Search parameter must be a string" });
            }
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { name: { $regex: safe, $options: "i" } },
                { publicID: { $regex: safe, $options: "i" } }
            ];
        }

        // Fetch top users sorted by likes
        const users = await userModel.find(query)
            .limit(50)
            .lean();

        // Sort manually by likes array length descending
        const sorted = users.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));

        // Batch fetch total games count for all users to avoid N+1 queries
        const userIds = sorted.map(u => u._id);
        const gamesCounts = await UserGame.aggregate([
            { $match: { userId: { $in: userIds } } },
            { $group: { _id: "$userId", count: { $sum: 1 } } }
        ]);

        const countsMap = new Map(gamesCounts.map(g => [g._id.toString(), g.count]));

        const formatted = sorted.map(u => {
            const entry = {
                profileHandle: u.profileHandle,
                name: u.name,
                profilePicture: u.profilePicture,
                likesCount: u.likes?.length || 0,
                bio: u.bio,
                totalGames: countsMap.get(u._id.toString()) || 0,
                allowPublicFriendRequests: u.allowPublicFriendRequests !== false
            };

            // Only expose publicID when the user allows public friend requests
            if (u.allowPublicFriendRequests !== false) {
                entry.publicID = u.publicID;
            }

            return entry;
        });

        res.status(200).json({ users: formatted });
    } catch (error) {
        next(error);
    }
};
