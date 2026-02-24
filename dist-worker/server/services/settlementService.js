"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleMarket = exports.fetchPolymarketMarket = void 0;
const prisma_1 = require("../db/prisma");
const BASE_FALLBACK = process.env.POLY_REST_URL || 'https://gamma-api.polymarket.com';
const FETCH_TIMEOUT_MS = Number(process.env.POLY_FETCH_TIMEOUT_MS || 8000);
const FETCH_RETRIES = Number(process.env.POLY_FETCH_RETRIES || 2);
function nowIso() {
    return new Date().toISOString();
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
async function fetchJsonWithTimeout(url) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            signal: ac.signal,
            headers: { 'accept': 'application/json' },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            return { ok: false, status: res.status, text };
        }
        const json = await res.json();
        return { ok: true, json };
    }
    finally {
        clearTimeout(t);
    }
}
function coerceOutcomePrices(raw) {
    // raw יכול להיות string של JSON או array
    let arr = raw;
    try {
        if (typeof raw === 'string')
            arr = JSON.parse(raw);
    }
    catch {
        // אם זה לא JSON תקין ניפול למטה
    }
    if (!Array.isArray(arr) || arr.length !== 2)
        return null;
    const a = Number(arr[0]);
    const b = Number(arr[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b))
        return null;
    return [a, b];
}
function determineResolvedOutcome(outcomePrices) {
    // תומך גם ב 1/0 וגם ב 0.99999 וכו
    const [yesP, noP] = outcomePrices;
    const eps = 1e-6;
    const yesIsOne = Math.abs(yesP - 1) < eps && Math.abs(noP - 0) < eps;
    const noIsOne = Math.abs(yesP - 0) < eps && Math.abs(noP - 1) < eps;
    if (yesIsOne)
        return 'YES';
    if (noIsOne)
        return 'NO';
    return null;
}
async function fetchPolymarketMarket(marketId) {
    const url = new URL('/events', BASE_FALLBACK);
    url.searchParams.set('id', marketId);
    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
        try {
            const r = await fetchJsonWithTimeout(url.toString());
            if (!r.ok) {
                console.warn(`[settlement] ${nowIso()} polymarket HTTP ${r.status} market=${marketId} attempt=${attempt} body=${String(r.text).slice(0, 200)}`);
                // retry על 5xx/429
                if (r.status >= 500 || r.status === 429) {
                    await sleep(250 * (attempt + 1));
                    continue;
                }
                return null;
            }
            const json = r.json;
            if (!Array.isArray(json) || json.length === 0)
                return null;
            for (const evt of json) {
                const markets = evt?.markets;
                if (!Array.isArray(markets))
                    continue;
                const found = markets.find((m) => String(m?.id) === String(marketId));
                if (found)
                    return found;
            }
            return null;
        }
        catch (err) {
            const isAbort = err?.name === 'AbortError';
            console.warn(`[settlement] ${nowIso()} polymarket fetch error market=${marketId} attempt=${attempt} abort=${isAbort}, err`);
            await sleep(250 * (attempt + 1));
            continue;
        }
    }
    return null;
}
exports.fetchPolymarketMarket = fetchPolymarketMarket;
async function settleMarket(marketId) {
    const poly = await fetchPolymarketMarket(marketId);
    if (!poly) {
        // אין מידע / API בעיה / לא נמצא
        return null;
    }
    if (!poly.closed) {
        // עדיין לא נסגר לפי polymarket
        return null;
    }
    const prices = coerceOutcomePrices(poly.outcomePrices);
    if (!prices) {
        console.warn(`[settlement] ${nowIso()} invalid outcomePrices market=${marketId} raw=${JSON.stringify(poly.outcomePrices)?.slice(0, 200)}`);
        return null;
    }
    const resolvedOutcome = determineResolvedOutcome(prices);
    if (!resolvedOutcome) {
        console.warn(`[settlement] ${nowIso()} cannot determine winner market=${marketId} outcomePrices=${JSON.stringify(prices)}`);
        return null;
    }
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        // ✅ CLAIM אטומי שמונע double payout
        const claimed = await tx.market.updateMany({
            where: { id: marketId, resolved: false },
            data: { resolved: true, resolvedOutcome },
        });
        if (claimed.count !== 1) {
            // מישהו כבר סגר (או אין כזה)
            return { skipped: true };
        }
        const openBets = await tx.bet.findMany({
            where: { marketId, status: 'OPEN' },
            select: { id: true, userId: true, outcome: true, shares: true },
        });
        let totalBets = openBets.length;
        let totalPayout = 0;
        let wonCount = 0;
        let lostCount = 0;
        for (const bet of openBets) {
            const isWin = bet.outcome === resolvedOutcome;
            if (isWin) {
                // ⚠ נקודות: כרגע 1 share = 1 point, ואז רצפה
                const payout = Math.floor(Number(bet.shares || 0) * 1);
                totalPayout += payout;
                wonCount++;
                await tx.bet.update({ where: { id: bet.id }, data: { status: 'WON' } });
                if (payout > 0) {
                    await tx.user.update({
                        where: { id: bet.userId },
                        data: { balancePoints: { increment: payout } },
                    });
                }
                await tx.ledger.create({
                    data: {
                        actorId: bet.userId,
                        targetUserId: bet.userId,
                        type: 'BET_WIN',
                        deltaPoints: payout,
                        referenceId: bet.id,
                    },
                });
            }
            else {
                lostCount++;
                await tx.bet.update({ where: { id: bet.id }, data: { status: 'LOST' } });
                await tx.ledger.create({
                    data: {
                        actorId: bet.userId,
                        targetUserId: bet.userId,
                        type: 'BET_LOSS',
                        deltaPoints: 0,
                        referenceId: bet.id,
                    },
                });
            }
        }
        return {
            skipped: false,
            marketId,
            resolvedOutcome,
            totalBets,
            wonCount,
            lostCount,
            totalPayout,
        };
    });
    if (!result.skipped) {
        console.log(`[settlement] ${nowIso()} settled market=${marketId} winner=${result.resolvedOutcome} bets=${result.totalBets} won=${result.wonCount} lost=${result.lostCount} payout=${result.totalPayout}`);
        // ⚠ אם totalPayout=0 באופן מוזר בגלל floor, לפחות תראה בלוג
        if (result.wonCount > 0 && result.totalPayout === 0) {
            console.warn(`[settlement] ${nowIso()} WARNING: market=${marketId} has winners but totalPayout=0 (floor/shares issue?)`);
        }
        return result;
    }
    return null;
}
exports.settleMarket = settleMarket;
