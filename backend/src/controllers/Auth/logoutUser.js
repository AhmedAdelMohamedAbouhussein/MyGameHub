import config from '../../config/env.js'
import { hashId } from '../../utils/logSanitize.js';

// @desc   Logout user
// @route  POST /api/auth/logout
export const logoutUser = (req, res, next) => {
    // Capture before session.destroy() — req.session is null inside the callback
    const userId = req.session?.userId;
    req.session.destroy(err => {
        if (err) {
            err.logContext = { userId: hashId(userId) };
            return next(err);
        }

        res.clearCookie('connect.sid',
            {
                httpOnly: true,
                secure: config.nodeEnv === "production", // secure only in prod
                sameSite: config.nodeEnv === "production" ? "none" : "lax",
            });

        res.json({ success: true, message: 'Logged out successfully' });
    });
};