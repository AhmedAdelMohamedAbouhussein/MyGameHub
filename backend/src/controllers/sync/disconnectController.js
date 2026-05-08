import userModel from "../../models/User.js";
import UserGame from "../../models/UserGame.js";
import Friendship from "../../models/Friendship.js";
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

        // 2. Remove from Owned Games (Normalized Collection)
        const gamesOnPlatform = await UserGame.find({ userId, platform });

        for (const game of gamesOnPlatform) {
            game.owners = game.owners.filter(o => o.accountId !== accountId);

            if (game.owners.length === 0) {
                await UserGame.deleteOne({ _id: game._id });
            } else {
                game.maxProgress = Math.max(...game.owners.map(o => o.progress || 0));
                await game.save();
            }
        }

        // 3. Remove Friends (Normalized Collection)
        await Friendship.deleteMany({ userId, source: platform, linkedAccountId: accountId });

        user.markModified('linkedAccounts');
        await user.save();

        res.status(200).json({ message: `Disconnected ${platform} account ${accountId} successfully.` });
    } catch (error) {
        error.logContext = { platform, accountId: hashId(accountId) };
        next(error);
    }
};
