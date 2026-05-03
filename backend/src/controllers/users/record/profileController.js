import userModel from "../../../models/User.js";

/**
 * @desc    Get a user's public profile and stats
 * @route   GET /api/users/profile/:publicID
 * @access  Public (Partial data if private)
 */
export const getPublicProfile = async (req, res, next) => {
    try {
        const publicID = decodeURIComponent(req.params.publicID).trim();
        let currentUserPublicID = null;

        if (req.session?.userId) {
            const currentUser = await userModel.findById(req.session.userId);
            currentUserPublicID = currentUser?.publicID;
        }

        const targetUser = await userModel.findOne({ publicID });

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

        // Calculate Friend Count
        if (targetUser.friends) {
            for (const [platform, friendsList] of targetUser.friends.entries()) {
                profile.friendsCount += friendsList.filter(f => f.status === "accepted").length;
            }
        }

        // Check Relationship Status with viewer
        if (currentUserPublicID && targetUser.friends?.get("User")) {
            const relationship = targetUser.friends.get("User").find(f => f.user === currentUserPublicID);
            if (relationship) {
                if (relationship.status === "accepted") {
                    profile.friendshipStatus = "accepted";
                } else if (relationship.status === "pending") {
                    profile.friendshipStatus = relationship.requestedByMe ? "requested_by_target" : "pending";
                }
            }
        }

        // Privacy Check: Only show stats if public or if they are friends
        const isSelf = currentUserPublicID === publicID;
        const isFriend = profile.friendshipStatus === "accepted";
        const canSeeStats = targetUser.profileVisibility === "public" || isFriend || isSelf;

        if (canSeeStats) {
            const unifiedGames = new Map();

            if (targetUser.ownedGames) {
                for (const [platform, gamesMap] of targetUser.ownedGames.entries()) {
                    for (const [gameId, game] of gamesMap.entries()) {
                        const gameName = game.gameName || game.title || "Unknown Game";
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
                                platform: platform,
                                hoursPlayed: hoursNum,
                                progress: game.maxProgress || 0
                            });
                        }
                    }
                }
            }

            const allGames = Array.from(unifiedGames.values());
            profile.totalGames = allGames.length;
            profile.totalHours = allGames.reduce((acc, g) => acc + g.hoursPlayed, 0);

            // Most played games (by hours, top 6)
            profile.mostPlayedGames = [...allGames]
                .sort((a, b) => b.hoursPlayed - a.hoursPlayed)
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
        const publicID = decodeURIComponent(req.params.publicID).trim();

        let currentUserPublicID = null;
        if (req.session?.userId) {
            const currentUser = await userModel.findById(req.session.userId);
            currentUserPublicID = currentUser?.publicID;
        }

        if (!currentUserPublicID) {
            return res.status(401).json({ message: "Unable to identify user session." });
        }

        if (publicID === currentUserPublicID) {
            return res.status(400).json({ message: "You cannot like your own profile" });
        }

        const targetUser = await userModel.findOne({ publicID });
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
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { publicID: { $regex: search, $options: "i" } }
            ];
        }

        // Fetch top users sorted by likes
        const users = await userModel.find(query)
            .limit(50)
            .lean();

        // Sort manually by likes array length descending
        const sorted = users.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));

        const formatted = sorted.map(u => {
            let totalGames = 0;
            if (u.ownedGames) {
                for (const platform in u.ownedGames) {
                    totalGames += Object.keys(u.ownedGames[platform]).length;
                }
            }
            return {
                publicID: u.publicID,
                name: u.name,
                profilePicture: u.profilePicture,
                likesCount: u.likes?.length || 0,
                bio: u.bio,
                totalGames,
                allowPublicFriendRequests: u.allowPublicFriendRequests !== false
            };
        });

        res.status(200).json({ users: formatted });
    } catch (error) {
        next(error);
    }
};
