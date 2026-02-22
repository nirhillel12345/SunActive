import { prisma } from '@/server/db/prisma'
import { redis, snapshotKey } from '@/server/redis'

type MarketDTO = {
  id: string
  question: string | null
  category: string | null
  volume: number | null
  resolved: boolean
  updatedAt: Date | null
  yesPrice: number | null
  noPrice: number | null
  probability: number | null
}

/**
 * Fetch markets from DB then retrieve Redis snapshots in one mget call.
 * Returns merged DTOs suitable for rendering on the Home page.
 */
export async function getMarketsWithPrices(opts?: { take?: number }) {
  const take = opts?.take ?? 200

  const markets = await prisma.market.findMany({
    orderBy: { updatedAt: 'desc' },
    take,
    select: { id: true, question: true, category: true, resolved: true, volume: true, updatedAt: true },
  })

  if (!markets || markets.length === 0) return [] as MarketDTO[]

  const keys = markets.map((m: any) => snapshotKey(m.id))
  const raws = await redis.mget(...keys)

  const result: MarketDTO[] = markets.map((m: any, idx: number) => {
    const raw = raws[idx]
    let yes: number | null = null
    let no: number | null = null
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        yes = typeof parsed?.yes === 'number' ? parsed.yes : null
        no = typeof parsed?.no === 'number' ? parsed.no : null
      } catch {
        // ignore parse
      }
    }

    const probability = yes != null ? Math.round(yes * 100) : null

    return {
      id: m.id,
      question: m.question ?? null,
      category: m.category ?? null,
      volume: typeof m.volume === 'number' ? m.volume : null,
      resolved: !!m.resolved,
      updatedAt: m.updatedAt ?? null,
      yesPrice: yes,
      noPrice: no,
      probability,
    }
  })

  return result
}

export type { MarketDTO }

export async function getMarketWithPrice(id: string) {
  const m = await prisma.market.findUnique({ select: { id: true, question: true, category: true, resolved: true, volume: true, updatedAt: true }, where: { id } })
  if (!m) return null

  const raw = await redis.get(snapshotKey(id))
  let yes: number | null = null
  let no: number | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      yes = typeof parsed?.yes === 'number' ? parsed.yes : null
      no = typeof parsed?.no === 'number' ? parsed.no : null
    } catch {}
  }

  const probability = yes != null ? Math.round(yes * 100) : null

  return {
    id: m.id,
    question: m.question ?? null,
    category: m.category ?? null,
    volume: typeof m.volume === 'number' ? m.volume : null,
    resolved: !!m.resolved,
    updatedAt: m.updatedAt ?? null,
    yesPrice: yes,
    noPrice: no,
    probability,
  }
}
