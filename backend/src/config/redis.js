// config/redis.js
import { createClient } from 'redis';
import logger from '../utils/logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

export default redisClient;