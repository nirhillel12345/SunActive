import { prisma } from '../db/prisma'
import { settleMarket } from '../services/settlementService'

const POLL_INTERVAL_MS = Number(process.env.SETTLEMENT_POLL_MS || 60_000)
const BATCH_SIZE = Number(process.env.SETTLEMENT_BATCH_SIZE || 50)

function nowIso() {
  return new Date().toISOString()
}

async function runOnce() {
  const startedAt = Date.now()
  try {
    const markets = await prisma.market.findMany({
      where: {
        resolved: false,
        closeTime: { not: null, lte: new Date() }, // חשוב: רק כאלה שכבר הגיע זמן הסגירה
      },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { closeTime: 'asc' },
    })

    if (!markets.length) {
      console.log(`[settlementWorker] ${nowIso()} no markets to check`)
      return
    }

    console.log(
      `[settlementWorker] ${nowIso()} checking ${markets.length} markets (batchSize=${BATCH_SIZE})`
    )

    for (const m of markets) {
      try {
        await settleMarket(m.id)
      } catch (err) {
        console.error(`[settlementWorker] ${nowIso()} error settling market=${m.id}, err`)
      }
    }
  } catch (err) {
    console.error(`[settlementWorker] ${nowIso()} runOnce fatal error, err`)
  } finally {
    console.log(
      `[settlementWorker] ${nowIso()} runOnce done in ${Date.now() - startedAt}ms`
    )
  }
}

let interval: NodeJS.Timeout | null = null

export function startSettlementWorker() {
  if (interval) return
  console.log('[settlementWorker] starting; intervalMs=', POLL_INTERVAL_MS)
  runOnce().catch((e) => console.error('[settlementWorker] initial run error:', e))
  interval = setInterval(() => {
    runOnce().catch((e) => console.error('[settlementWorker] loop error:', e))
  }, POLL_INTERVAL_MS)
}

export function stopSettlementWorker() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}