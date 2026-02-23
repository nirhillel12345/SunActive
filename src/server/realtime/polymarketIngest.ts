import WebSocket from 'ws'
import Redis from 'ioredis'
import { prisma } from '../db/prisma'

type Side = 'YES' | 'NO'

type PriceState = {
  yes: number | null
  no: number | null
  updatedAt: number
}

const REDIS_URL = process.env.REDIS_URL!
if (!REDIS_URL) throw new Error('REDIS_URL is required')

const POLY_WS_URL =
  process.env.POLY_WS_URL ||
  'wss://ws-subscriptions-clob.polymarket.com/ws/market'

const PING_INTERVAL_MS = Number(process.env.POLY_WS_PING_INTERVAL_MS || 10000)
const INITIAL_DUMP =
  (process.env.POLY_WS_INITIAL_DUMP || 'true') === 'true'

const redis = new Redis(REDIS_URL)
const pub = new Redis(REDIS_URL)

function redisKey(marketId: string) {
  return `market:${marketId}`
}

function redisUpdatesChannel(marketId: string) {
  return `market:${marketId}:updates`
}

function isProb(n: number) {
  return Number.isFinite(n) && n > 0 && n < 1
}

function normalize(n: any): number | null {
  const x = Number(n)
  if (!Number.isFinite(x)) return null
  if (x > 1 && x <= 100) return x / 100
  if (x >= 0 && x <= 1) return x
  return null
}

function computeMid(bid: any, ask: any): number | null {
  const b = normalize(bid)
  const a = normalize(ask)
  if (b == null || a == null) return null
  const mid = (b + a) / 2
  return isProb(mid) ? mid : null
}

async function buildMappings() {
  const markets = await prisma.market.findMany({
    where: {
      resolved: false,
      tokenYesId: { not: null },
      tokenNoId: { not: null },
    },
    select: { id: true, tokenYesId: true, tokenNoId: true },
    take: 5000,
  })

  const assetToMarket = new Map<string, { marketId: string; side: Side }>()
  const assetIds: string[] = []

  for (const m of markets) {
    const yes = String(m.tokenYesId)
    const no = String(m.tokenNoId)

    if (!yes || !no) continue

    assetToMarket.set(yes, { marketId: m.id, side: 'YES' })
    assetToMarket.set(no, { marketId: m.id, side: 'NO' })

    assetIds.push(yes)
    assetIds.push(no)
  }

  return { assetIds, assetToMarket }
}

async function mergeAndPublish(
  marketId: string,
  side: Side,
  price: number
) {
  const key = redisKey(marketId)

  let existing: PriceState = {
    yes: null,
    no: null,
    updatedAt: 0,
  }

  const raw = await redis.get(key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      existing = {
        yes: typeof parsed.yes === 'number' ? parsed.yes : null,
        no: typeof parsed.no === 'number' ? parsed.no : null,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      }
    } catch {}
  }

  const next: PriceState = {
    yes: side === 'YES' ? price : existing.yes,
    no: side === 'NO' ? price : existing.no,
    updatedAt: Date.now(),
  }

  if (
    next.yes === existing.yes &&
    next.no === existing.no
  ) {
    return
  }

  const payload = JSON.stringify(next)

  await redis.set(key, payload)
  await pub.publish(redisUpdatesChannel(marketId), payload)
}

export function startPolymarketIngest() {
  let stopped = false

  ;(async () => {
    let attempt = 0

    while (!stopped) {
      try {
        const { assetIds, assetToMarket } =
          await buildMappings()

        if (!assetIds.length) {
          console.warn('No markets found. Retrying...')
          await new Promise((r) => setTimeout(r, 5000))
          continue
        }

        console.log(
          `Connecting to Polymarket WS (${assetIds.length} assets)`
        )

        const ws = new WebSocket(POLY_WS_URL)

        await new Promise<void>((resolve, reject) => {
          ws.once('open', resolve)
          ws.once('error', reject)
        })

        attempt = 0
        console.log('Connected.')

        ws.send(
          JSON.stringify({
            type: 'market',
            assets_ids: assetIds,
            initial_dump: INITIAL_DUMP,
          })
        )

        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, PING_INTERVAL_MS)

        ws.on('message', async (buf) => {
          const text = buf.toString()
          if (text === 'pong' || text === 'ping') return

          let msg: any
          try {
            msg = JSON.parse(text)
          } catch {
            return
          }

          const messages = Array.isArray(msg) ? msg : [msg]

          for (const m of messages) {
            if (!Array.isArray(m.price_changes)) continue

            for (const change of m.price_changes) {
              const assetId = String(change.asset_id)
              const mapping =
                assetToMarket.get(assetId)
              if (!mapping) continue

              let price =
                computeMid(
                  change.best_bid,
                  change.best_ask
                ) ??
                normalize(change.price)

              if (!price || !isProb(price)) continue

              await mergeAndPublish(
                mapping.marketId,
                mapping.side,
                price
              )
            }
          }
        })

        await new Promise<void>((resolve) => {
          ws.once('close', resolve)
          ws.once('error', resolve)
        })

        clearInterval(ping)
        console.warn('Disconnected. Reconnecting...')
      } catch (err) {
        attempt++
        const delay = Math.min(
          30000,
          1000 * Math.pow(1.7, attempt)
        )
        console.error('WS error:', err)
        console.warn(`Retrying in ${delay}ms`)
        await new Promise((r) =>
          setTimeout(r, delay)
        )
      }
    }
  })()

  return {
    stop: async () => {
      stopped = true
      redis.disconnect()
      pub.disconnect()
    },
  }
}

if (require.main === module) {
  startPolymarketIngest()
}