"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketWithPrice = exports.getMarketsWithPrices = void 0;
const prisma_1 = require("@/server/db/prisma");
const redis_1 = require("@/server/redis");
/**
 * Fetch markets from DB then retrieve Redis snapshots in one mget call.
 * Returns merged DTOs suitable for rendering on the Home page.
 */
async function getMarketsWithPrices(opts) {
    const take = opts?.take ?? 200;
    const markets = await prisma_1.prisma.market.findMany({
        orderBy: { updatedAt: 'desc' },
        take,
        select: { id: true, question: true, category: true, resolved: true, volume: true, updatedAt: true, imageUrl: true },
    });
    if (!markets || markets.length === 0)
        return [];
    const keys = markets.map((m) => (0, redis_1.snapshotKey)(m.id));
    const raws = await redis_1.redis.mget(...keys);
    const result = markets.map((m, idx) => {
        const raw = raws[idx];
        let yes = null;
        let no = null;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                yes = typeof parsed?.yes === 'number' ? parsed.yes : null;
                no = typeof parsed?.no === 'number' ? parsed.no : null;
            }
            catch {
                // ignore parse
            }
        }
        const probability = yes != null ? Math.round(yes * 100) : null;
        return {
            id: m.id,
            question: m.question ?? null,
            category: m.category ?? null,
            volume: typeof m.volume === 'number' ? m.volume : null,
            resolved: !!m.resolved,
            updatedAt: m.updatedAt ?? null,
            yesPrice: yes,
            noPrice: no,
            imageUrl: m.imageUrl ?? null,
            probability,
        };
    });
    return result;
}
exports.getMarketsWithPrices = getMarketsWithPrices;
async function getMarketWithPrice(id) {
    const m = await prisma_1.prisma.market.findUnique({ select: { id: true, question: true, category: true, resolved: true, volume: true, updatedAt: true }, where: { id } });
    if (!m)
        return null;
    const raw = await redis_1.redis.get((0, redis_1.snapshotKey)(id));
    let yes = null;
    let no = null;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            yes = typeof parsed?.yes === 'number' ? parsed.yes : null;
            no = typeof parsed?.no === 'number' ? parsed.no : null;
        }
        catch { }
    }
    const probability = yes != null ? Math.round(yes * 100) : null;
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
    };
}
exports.getMarketWithPrice = getMarketWithPrice;
