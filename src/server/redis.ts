import Redis from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  throw new Error('REDIS_URL is required')
}

export const redis = new Redis(REDIS_URL)
export const redisSub = new Redis(REDIS_URL)

export function snapshotKey(marketId: string) {
  return `market:${marketId}`
}

export function updatesChannel(marketId: string) {
  return `market:${marketId}:updates`
}
