import config from '../config/env.js';
import logger from '../utils/logger.js';

const errorHandeler = (err, req, res, next) => {
    // If it's a known operational error with a specific status code, don't log —
    // these are expected (validation errors, 404s, etc.) and already have a clear message.
    if (err.status) {
        return res.status(err.status).json({ message: err.message });
    }

    // Handle Multer file size limit error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File is too large. Maximum size is 5MB." });
    }

    // For unexpected 500s — log once here with any sanitized context the controller attached.
    // Controllers should NOT call logger.error() before next(err); instead they set:
    //   err.logContext = { userId: hashId(userId), ... }
    const logMeta = {
        err,
        url: req.originalUrl,
        method: req.method,
        ...(err.logContext || {})   // merge in any controller-supplied context
    };
    logger.error(logMeta, 'Internal Server Error');

    const message = config.nodeEnv === 'production'
        ? "An unexpected internal server error occurred"
        : err.message;

    res.status(500).json({ message });
};

export default errorHandeler;