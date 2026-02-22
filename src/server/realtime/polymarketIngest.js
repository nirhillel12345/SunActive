import WebSocket from 'ws';
import Redis from 'ioredis';
import { prisma } from '@/server/db/prisma';
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL)
    throw new Error('REDIS_URL is required');
const POLY_WS_URL = process.env.POLY_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const PING_INTERVAL_MS = Number(process.env.POLY_WS_PING_INTERVAL_MS || 10000);
const LEVEL = Number(process.env.POLY_WS_LEVEL || 2);
const INITIAL_DUMP = (process.env.POLY_WS_INITIAL_DUMP || 'true') === 'true';
const redis = new Redis(REDIS_URL); // KV
const pub = new Redis(REDIS_URL); // pub/sub
function redisKey(marketId) {
    return `market:${marketId}`;
}
function redisUpdatesChannel(marketId) {
    return `market:${marketId}:updates`;
}
function isProb(x) {
    return typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 1;
}
function normalizePrice(x) {
    const n = Number(x);
    if (!Number.isFinite(n))
        return null;
    // Sometimes percent-like values appear; normalize if needed
    if (n > 1 && n <= 100)
        return n / 100;
    if (n >= 0 && n <= 1)
        return n;
    return null;
}
/**
 * Compute a single “price” from a WS message.
 * Prefer lastTradePrice, else mid(bestBid,bestAsk), else null.
 */
function extractPriceFromMsg(msg) {
    if (!msg || typeof msg !== 'object')
        return null;
    const data = msg.data ?? msg.payload ?? msg;
    const last = normalizePrice(data.lastTradePrice ?? data.last_trade_price ?? data.last);
    if (last != null && last > 0 && last < 1)
        return last;
    const bid = normalizePrice(data.bestBid ?? data.best_bid ?? data.bid);
    const ask = normalizePrice(data.bestAsk ?? data.best_ask ?? data.ask);
    if (bid != null && ask != null && bid > 0 && ask > 0 && bid < 1 && ask < 1) {
        const mid = (bid + ask) / 2;
        return mid > 0 && mid < 1 ? mid : null;
    }
    const price = normalizePrice(data.price ?? data.p);
    if (price != null && price > 0 && price < 1)
        return price;
    return null;
}
/**
 * Extract assetId from WS message (Market Channel uses assets).
 */
function extractAssetId(msg) {
    if (!msg || typeof msg !== 'object')
        return null;
    const data = msg.data ?? msg.payload ?? msg;
    const asset = data.asset_id ??
        data.assetId ??
        data.token_id ??
        data.tokenId ??
        data.asset ??
        data.id; // sometimes the asset id is “id” inside the message type
    if (asset == null)
        return null;
    return String(asset);
}
/**
 * Load active markets and build:
 * - unique assetIds array
 * - assetId -> { marketId, side }
 */
async function buildMappings() {
    const markets = await prisma.market.findMany({
        where: {
            resolved: false,
            tokenYesId: { not: null },
            tokenNoId: { not: null },
        },
        select: { id: true, tokenYesId: true, tokenNoId: true },
        take: 5000, // safety cap
    });
    const assetToMarket = new Map();
    const marketToSides = new Map();
    const assetSet = new Set();
    for (const m of markets) {
        const yes = String(m.tokenYesId);
        const no = String(m.tokenNoId);
        if (!yes || !no)
            continue;
        marketToSides.set(m.id, { yesAsset: yes, noAsset: no });
        assetToMarket.set(yes, { marketId: m.id, side: 'YES' });
        assetToMarket.set(no, { marketId: m.id, side: 'NO' });
        assetSet.add(yes);
        assetSet.add(no);
    }
    return {
        assetIds: Array.from(assetSet),
        assetToMarket,
        marketToSides,
    };
}
async function mergeAndWritePrice(marketId, patch) {
    const key = redisKey(marketId);
    // Merge with existing so YES/NO can update independently.
    let existing = { yes: null, no: null, updatedAt: 0 };
    const raw = await redis.get(key);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            existing = {
                yes: typeof parsed?.yes === 'number' ? parsed.yes : null,
                no: typeof parsed?.no === 'number' ? parsed.no : null,
                updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
            };
        }
        catch { }
    }
    const next = {
        yes: patch.yes ?? existing.yes,
        no: patch.no ?? existing.no,
        updatedAt: Date.now(),
    };
    // Only publish if we have at least one side
    if (next.yes == null && next.no == null)
        return;
    const payload = JSON.stringify(next);
    await redis.set(key, payload);
    await pub.publish(redisUpdatesChannel(marketId), payload);
}
let ws = null;
let stopped = false;
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
export function startPolymarketIngest() {
    stopped = false;
    (async () => {
        let attempt = 0;
        while (!stopped) {
            attempt += 1;
            const backoff = Math.min(30000, 1000 * Math.pow(1.6, attempt));
            try {
                // Rebuild mapping each connect (markets can change)
                const { assetIds, assetToMarket } = await buildMappings();
                if (assetIds.length === 0) {
                    console.warn('[polymarketIngest] no markets with tokenYesId/tokenNoId found; retrying in 5s');
                    await sleep(5000);
                    continue;
                }
                console.log(`[polymarketIngest] connecting to ${POLY_WS_URL} assets=${assetIds.length}`);
                ws = new WebSocket(POLY_WS_URL, { handshakeTimeout: 15000 });
                await new Promise((resolve, reject) => {
                    if (!ws)
                        return reject(new Error('ws not created'));
                    ws.once('open', () => resolve());
                    ws.once('error', (err) => reject(err));
                });
                attempt = 0;
                console.log('[polymarketIngest] connected');
                // Subscription message per docs: type must be "market"
                const subMsg = {
                    type: 'market',
                    assets_ids: assetIds,
                    initial_dump: INITIAL_DUMP,
                    level: LEVEL,
                };
                ws.send(JSON.stringify(subMsg));
                console.log('[polymarketIngest] subscribed');
                // Client heartbeat: send "ping" string every 10s (per docs)
                const pingTimer = setInterval(() => {
                    try {
                        if (ws && ws.readyState === WebSocket.OPEN)
                            ws.send('ping');
                    }
                    catch { }
                }, PING_INTERVAL_MS);
                ws.on('message', async (buf) => {
                    const text = buf.toString();
                    // Pong messages are often plain strings
                    if (text === 'pong' || text === 'ping')
                        return;
                    let msg;
                    try {
                        msg = JSON.parse(text);
                    }
                    catch {
                        return;
                    }
                    // Some servers wrap messages in arrays
                    const messages = Array.isArray(msg) ? msg : [msg];
                    for (const m of messages) {
                        const assetId = extractAssetId(m);
                        if (!assetId)
                            continue;
                        const mapping = assetToMarket.get(assetId);
                        if (!mapping)
                            continue;
                        const price = extractPriceFromMsg(m);
                        if (price == null || !isProb(price))
                            continue;
                        if (mapping.side === 'YES') {
                            await mergeAndWritePrice(mapping.marketId, { yes: price });
                        }
                        else {
                            await mergeAndWritePrice(mapping.marketId, { no: price });
                        }
                    }
                });
                await new Promise((resolve) => {
                    if (!ws)
                        return resolve();
                    ws.once('close', () => resolve());
                    ws.once('error', () => resolve());
                });
                clearInterval(pingTimer);
                console.warn('[polymarketIngest] disconnected; reconnecting...');
            }
            catch (err) {
                console.error('[polymarketIngest] error:', err);
                console.warn(`[polymarketIngest] retrying in ${Math.round(backoff)}ms`);
                await sleep(backoff);
            }
        }
    })().catch((e) => console.error('[polymarketIngest] fatal:', e));
    return {
        stop: async () => {
            stopped = true;
            try {
                ws?.close();
            }
            catch { }
            redis.disconnect();
            pub.disconnect();
        },
    };
}
// Run directly
if (require.main === module) {
    startPolymarketIngest();
}
