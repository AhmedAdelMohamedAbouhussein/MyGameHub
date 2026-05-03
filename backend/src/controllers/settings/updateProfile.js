import userModel from "../../models/User.js";

export const updateProfile = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { username, bio, visibility, allowPublicFriendRequests, favoriteGames, themeSongId, masterpieceGame } = req.body;

        const updateData = {};
        if (username !== undefined) updateData.name = String(username).trim().substring(0, 50);
        if (bio !== undefined) updateData.bio = String(bio).trim().substring(0, 300);
        if (visibility !== undefined) {
            updateData.profileVisibility = ["public", "private"].includes(visibility) ? visibility : "public";
        }
        if (allowPublicFriendRequests !== undefined) updateData.allowPublicFriendRequests = !!allowPublicFriendRequests;
        if (themeSongId !== undefined) updateData.themeSongId = String(themeSongId).trim().substring(0, 50);
        
        if (masterpieceGame !== undefined) {
            if (masterpieceGame === null) {
                updateData.masterpieceGame = null;
            } else {
                const quote = String(masterpieceGame.quote || "").trim().substring(0, 100);
                updateData.masterpieceGame = {
                    platform: String(masterpieceGame.platform || "").trim(),
                    gameId: String(masterpieceGame.gameId || "").trim(),
                    gameName: String(masterpieceGame.gameName || "").trim(),
                    coverImage: String(masterpieceGame.coverImage || "").trim(),
                    quote: quote
                };
            }
        }

        if (favoriteGames !== undefined) {
            if (Array.isArray(favoriteGames)) {
                updateData.favoriteGames = favoriteGames.slice(0, 4).map(game => ({
                    platform: String(game.platform || "").trim(),
                    gameId: String(game.gameId || "").trim(),
                    gameName: String(game.gameName || game.title || "").trim(),
                    coverImage: String(game.coverImage || "").trim(),
                    hoursPlayed: Number(game.hoursPlayed) || 0,
                    progress: Number(game.progress) || 0
                }));
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No data provided to update" });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update profile error:", error);
        next(error);
    }
};
