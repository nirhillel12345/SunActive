"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopSettlementWorker = exports.startSettlementWorker = void 0;
const prisma_1 = require("../db/prisma");
const settlementService_1 = require("../services/settlementService");
const POLL_INTERVAL_MS = Number(process.env.SETTLEMENT_POLL_MS || 60000);
const BATCH_SIZE = Number(process.env.SETTLEMENT_BATCH_SIZE || 50);
function nowIso() {
    return new Date().toISOString();
}
async function runOnce() {
    const startedAt = Date.now();
    try {
        const markets = await prisma_1.prisma.market.findMany({
            where: {
                resolved: false,
                closeTime: { not: null, lte: new Date() }, // חשוב: רק כאלה שכבר הגיע זמן הסגירה
            },
            select: { id: true },
            take: BATCH_SIZE,
            orderBy: { closeTime: 'asc' },
        });
        if (!markets.length) {
            console.log(`[settlementWorker] ${nowIso()} no markets to check`);
            return;
        }
        console.log(`[settlementWorker] ${nowIso()} checking ${markets.length} markets (batchSize=${BATCH_SIZE})`);
        for (const m of markets) {
            try {
                await (0, settlementService_1.settleMarket)(m.id);
            }
            catch (err) {
                console.error(`[settlementWorker] ${nowIso()} error settling market=${m.id}, err`);
            }
        }
    }
    catch (err) {
        console.error(`[settlementWorker] ${nowIso()} runOnce fatal error, err`);
    }
    finally {
        console.log(`[settlementWorker] ${nowIso()} runOnce done in ${Date.now() - startedAt}ms`);
    }
}
let interval = null;
function startSettlementWorker() {
    if (interval)
        return;
    console.log('[settlementWorker] starting; intervalMs=', POLL_INTERVAL_MS);
    runOnce().catch((e) => console.error('[settlementWorker] initial run error:', e));
    interval = setInterval(() => {
        runOnce().catch((e) => console.error('[settlementWorker] loop error:', e));
    }, POLL_INTERVAL_MS);
}
exports.startSettlementWorker = startSettlementWorker;
function stopSettlementWorker() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
exports.stopSettlementWorker = stopSettlementWorker;
