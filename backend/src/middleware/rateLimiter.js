import rateLimit from 'express-rate-limit';

// Global rate limiter
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    message: { message: "Too many requests from this IP, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limiter for brute-force protection
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 10 auth requests per 15 minutes
    message: { message: "Too many authentication attempts from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

export const syncLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 sync requests per 15 minutes
    message: { message: "Too many sync attempts from this IP, please try again after 10 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});