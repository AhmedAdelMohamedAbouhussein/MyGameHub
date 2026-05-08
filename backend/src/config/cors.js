import config from './env.js';

const allowedOrigins = [
  "https://55b405d5.mygamehub-bxz.pages.dev/",
  "http://localhost:5173",
  "http://localhost:3000",
];

if (config.frontendUrl && !allowedOrigins.includes(config.frontendUrl)) {
  allowedOrigins.push(config.frontendUrl);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

export default corsOptions;