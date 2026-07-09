import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient;
let pubClient;
let subClient;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

if (process.env.NODE_ENV === 'test') {
  // Dynamic import ioredis-mock in test environment so a live Redis instance isn't required in CI
  const RedisMock = (await import('ioredis-mock')).default;
  redisClient = new RedisMock();
  pubClient = new RedisMock();
  subClient = new RedisMock();
  console.log('Redis client initialized in Mock Mode for Jest testing.');
} else {
  console.log(`Connecting to Redis at: ${redisUrl}`);
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    reconnectionDelay: 1000
  });

  redisClient.on('error', (err) => {
    console.error('Redis client connection error:', err.message);
  });

  pubClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });

  pubClient.on('error', (err) => {
    console.error('Redis pub client error:', err.message);
  });

  subClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });

  subClient.on('error', (err) => {
    console.error('Redis sub client error:', err.message);
  });
}

export { redisClient, pubClient, subClient };
