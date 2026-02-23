"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMarkets = void 0;
const prisma_1 = require("@/server/db/prisma");
const rest_1 = require("@/server/adapters/polymarket/rest");
/**
 * Sync markets from Polymarket adapter into our DB.
 * Returns the number of markets upserted.
 */
async function syncMarkets() {
    const markets = await (0, rest_1.fetchMarkets)();
    if (!Array.isArray(markets) || markets.length === 0)
        return 0;
    let count = 0;
    // Use transaction for bulk upserts
    await prisma_1.prisma.$transaction(async (tx) => {
        for (const m of markets) {
            try {
                const data = {
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
                };
                // Upsert by id
                await tx.market.upsert({
                    where: { id: String(m.id) },
                    update: data,
                    create: data
                });
                count++;
            }
            catch (err) {
                // log and continue
                console.error('Failed to upsert market', m?.id, err);
            }
        }
    });
    return count;
}
exports.syncMarkets = syncMarkets;
