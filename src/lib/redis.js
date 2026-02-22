import Redis from 'ioredis';
// ensure we pass a string to the client constructor in this environment
const redis = new Redis(process.env.REDIS_URL);
export default redis;
