import config from './env.js';

const allowedOrigins = [
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