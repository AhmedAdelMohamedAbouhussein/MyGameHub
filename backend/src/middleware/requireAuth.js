/**
 * requireAuth middleware
 * Checks if user is logged in via session.
 * Use on any route that requires authentication.
 */
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated. Please log in." });
    }
    next();
};

export default requireAuth;
