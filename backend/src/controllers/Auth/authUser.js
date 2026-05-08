import userModel from '../../models/User.js'
import Friendship from '../../models/Friendship.js';
import UserGame from '../../models/UserGame.js';
import logger from '../../utils/logger.js';
import { hashId } from '../../utils/logSanitize.js';

// @desc  
// @route  get /auth/authUser
export const authUser = async (req, res, next) => {
    try {
        if (!req.session?.userId) {
            logger.warn({ ip: req.ip }, 'authUser called with no session');

            const error = new Error("Not authenticated");
            error.status = 401;
            return next(error);
        }

        // Fetch user info from DB using the session's userId, including password for state check
        const user = await userModel.findById(req.session.userId).select("+password");

        if (!user) {
            logger.warn({ userId: hashId(req.session.userId) }, 'authUser: user not found in DB');

            const error = new Error("User not found");
            error.status = 404;
            return next(error);
        }

        // Enrich with counts for frontend compatibility
        const [friendCount, gameCount] = await Promise.all([
            Friendship.countDocuments({ userId: user._id, status: "accepted" }),
            UserGame.countDocuments({ userId: user._id })
        ]);

        const userObj = user.toJSON();
        userObj.friendsCount = friendCount;
        userObj.totalGames = gameCount;

        logger.debug({ userId: hashId(req.session.userId) }, 'authUser: authenticated');
        return res.json({ user: userObj });
    }
    catch (error) {
        error.logContext = {};
        next(error);
    }
}