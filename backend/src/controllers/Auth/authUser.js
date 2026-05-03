import userModel from '../../models/User.js'
import logger from '../../utils/logger.js';
import { hashId } from '../../utils/logSanitize.js';

// @desc  
// @route  get /auth/authUser
export const authUser = async (req, res, next) => 
{
    try 
    {
        if (!req.session?.userId) 
        {
            logger.warn({ ip: req.ip }, 'authUser called with no session');

            const error = new Error("Not authenticated");
            error.status = 401;
            return next(error);
        }

        // Fetch user info from DB using the session's userId, including password for state check
        const user = await userModel.findById(req.session.userId).select("+password");

        if (!user) 
        {
            logger.warn({ userId: hashId(req.session.userId) }, 'authUser: user not found in DB');

            const error = new Error("User not found");
            error.status = 404;
            return next(error);
        }

        logger.debug({ userId: hashId(req.session.userId) }, 'authUser: authenticated');
        return res.json({ user: user }); // toJSON transform handles cleanup and hasPassword
    } 
    catch (error) 
    {
        error.logContext = {};
        next(error);
    }
}