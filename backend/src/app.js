import express from 'express';
import cors from 'cors';

import corsOptions from './config/cors.js';
import sessionMiddleware from './config/session.js';

import redisClient from './config/redis.js';

import Auth from './routes/Auth.js';
import games from './routes/games.js';
import sync from './routes/sync.js';
import usersCRUD from './routes/users.js';
import NodeMailer from './routes/nodeMailer.js';
import Friends from './routes/Friends.js'
import Settings from './routes/settings.js';
import Refresh from './routes/refresh.js';
import Notifications from './routes/notifications.js';

import logger from './middleware/logger.js';
import errorHandeler from './middleware/error.js';
import notfound from './middleware/notfound.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import helmet from 'helmet';

import { generateToken, csrfSynchronisedProtection } from './middleware/csrf.js';

const app = express();

// Trust the first proxy (Cloudflare/AWS)
app.set('trust proxy', 1);


// ── redis ──────────────────────────────────────────────────────────

await redisClient.connect();

// ── Core middleware ──────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// Global Rate Limiting
app.use(globalLimiter);

app.use(express.json());

app.use(cors(corsOptions));
app.use(logger);
app.use(sessionMiddleware);

// CSRF Protection
// Expose endpoint for frontend to get the token
app.get('/api/csrf-token', (req, res) => {
    res.json({ token: generateToken(req) });
});
// Apply CSRF protection to all subsequent routes
app.use(csrfSynchronisedProtection);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', Auth);
app.use('/api/games', games);
app.use('/api/users', usersCRUD);
app.use('/api/sync', sync);
app.use('/api/mail', NodeMailer);
app.use('/api/friends', Friends);
app.use('/api/setting', Settings);
app.use('/api/refresh', Refresh);
app.use('/api/notifications', Notifications);

// ── Error-handling middleware ─────────────────────────────────────────────────
app.use(notfound);
app.use(errorHandeler);

export default app;
