// config/session.js
import session from 'express-session';
import MongoStore from 'connect-mongo';
import config from './env.js';

const sessionMiddleware = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongoUri || 'mongodb://localhost/test',
    collectionName: 'sessions'
  }),
  cookie: {
    httpOnly: true,
    //secure: config.nodeEnv === "production",
    //sameSite: config.nodeEnv === "production" ? "none" : "lax",
    // Forced to true/none for ngrok/production cross-domain support
    secure: true,
    sameSite: "none",
  }
});

export default sessionMiddleware;