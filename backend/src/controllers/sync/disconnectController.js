import userModel from "../../models/User.js";
import logger from "../../utils/logger.js";
import { hashId } from "../../utils/logSanitize.js";

/**
 * @desc    Disconnect a specific platform account
 * @route   DELETE /api/sync/:platform/:accountId
 * @access  Private
 */
export const disconnectAccount = async (req, res, next) => {
    try {
        const { platform, accountId } = req.params;
        const userId = req.session.userId;

        if (!userId) return res.status(401).json({ message: "Not authenticated" });

        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 1. Remove from Linked Accounts
        if (user.linkedAccounts && user.linkedAccounts.has(platform)) {
            let accounts = user.linkedAccounts.get(platform);
            accounts = accounts.filter(acc => acc.accountId !== accountId);
            
            if (accounts.length === 0) {
                user.linkedAccounts.delete(platform);
            } else {
                user.linkedAccounts.set(platform, accounts);
            }
        }

        // 2. Remove from Owned Games
        if (user.ownedGames && user.ownedGames.has(platform)) {
            let gamesMap = user.ownedGames.get(platform);
            
            for (const [gameId, game] of gamesMap.entries()) {
                // Filter out this account from owners
                game.owners = game.owners.filter(o => o.accountId !== accountId);
                
                if (game.owners.length === 0) {
                    // No owners left for this platform, remove the game
                    gamesMap.delete(gameId);
                } else {
                    // Update summary stats
                    game.maxProgress = Math.max(...game.owners.map(o => o.progress || 0));
                    // totalHours update could go here
                }
            }
            
            if (gamesMap.size === 0) {
                user.ownedGames.delete(platform);
            }
        }

        // 3. Remove Friends
        if (user.friends && user.friends.has(platform)) {
            let friendsList = user.friends.get(platform);
            friendsList = friendsList.filter(f => f.linkedAccountId !== accountId);
            
            if (friendsList.length === 0) {
                user.friends.delete(platform);
            } else {
                user.friends.set(platform, friendsList);
            }
        }

        user.markModified('linkedAccounts');
        user.markModified('ownedGames');
        user.markModified('friends');
        await user.save();

        res.status(200).json({ message: `Disconnected ${platform} account ${accountId} successfully.` });
    } catch (error) {
        error.logContext = { platform, accountId: hashId(accountId) };
        next(error);
    }
};
