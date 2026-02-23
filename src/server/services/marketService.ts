import { prisma } from '@/server/db/prisma'
import { fetchMarkets } from '@/server/adapters/polymarket/rest'

/**
 * Sync markets from Polymarket adapter into our DB.
 * Returns the number of markets upserted.
 */
export async function syncMarkets() {
  const markets = await fetchMarkets()
  if (!Array.isArray(markets) || markets.length === 0) return 0

  let count = 0

  // Use transaction for bulk upserts
  await prisma.$transaction(async (tx: any) => {
    for (const m of markets) {
      try {
        const data: any = {
          id: m.id,
          question: m.question ?? '',
          description: m.description ?? null,
          category: m.category ?? null,
          closeTime: m.closeTime ? new Date(m.closeTime) : null,
          resolved: !!m.resolved,
          resolvedOutcome: m.resolvedOutcome ?? null,
          liquidity: typeof m.liquidity === 'number' ? m.liquidity : (m.liquidity ? Number(m.liquidity) : null),
          volume: typeof m.volume === 'number' ? m.volume : (m.volume ? Number(m.volume) : null),
          tokenYesId: m.tokenYesId ?? null,
          tokenNoId: m.tokenNoId ?? null,
          imageUrl: m.imageUrl ?? null,
        }

        // Upsert by id
        await tx.market.upsert({
          where: { id: String(m.id) },
          update: data,
          create: data
        })

        count++
      } catch (err) {
        // log and continue
        console.error('Failed to upsert market', m?.id, err)
      }
    }
  })

  return count
}
