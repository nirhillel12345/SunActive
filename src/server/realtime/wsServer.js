import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL)
    throw new Error('REDIS_URL is required');
const WS_PORT = Number(process.env.WS_PORT || 4001);
const redis = new Redis(REDIS_URL); // snapshots
const sub = new Redis(REDIS_URL); // pub/sub
const wss = new WebSocketServer({ port: WS_PORT, path: '/ws' });
const subscriptions = new Map(); // marketId -> clients
const channelRefCount = new Map(); // marketId -> ref count
function updatesChannel(marketId) {
    return `market:${marketId}:updates`;
}
function snapshotKey(marketId) {
    return `market:${marketId}`;
}
function sendSafe(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN)
        return;
    try {
        ws.send(JSON.stringify(payload));
    }
    catch { }
}
async function sendSnapshot(ws, marketId) {
    try {
        const raw = await redis.get(snapshotKey(marketId));
        sendSafe(ws, { type: 'snapshot', marketId, data: raw ? JSON.parse(raw) : null });
    }
    catch {
        sendSafe(ws, { type: 'error', error: 'snapshot_error', marketId });
    }
}
async function ensureSubscribe(marketId) {
    const prev = channelRefCount.get(marketId) || 0;
    if (prev === 0)
        await sub.subscribe(updatesChannel(marketId));
    channelRefCount.set(marketId, prev + 1);
}
async function ensureUnsubscribe(marketId) {
    const prev = channelRefCount.get(marketId) || 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
        await sub.unsubscribe(updatesChannel(marketId));
        channelRefCount.delete(marketId);
    }
    else {
        channelRefCount.set(marketId, next);
    }
}
function addClient(marketId, ws) {
    let set = subscriptions.get(marketId);
    if (!set) {
        set = new Set();
        subscriptions.set(marketId, set);
    }
    set.add(ws);
}
function removeClient(marketId, ws) {
    const set = subscriptions.get(marketId);
    if (!set)
        return;
    set.delete(ws);
    if (set.size === 0)
        subscriptions.delete(marketId);
}
wss.on('connection', (ws) => {
    ws.subscribedMarketIds = new Set();
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    ws.on('message', async (buf) => {
        let msg;
        try {
            msg = JSON.parse(buf.toString());
        }
        catch {
            return sendSafe(ws, { type: 'error', error: 'invalid_json' });
        }
        const type = msg?.type;
        const marketId = msg?.marketId ? String(msg.marketId) : null;
        if (type === 'subscribe' && marketId) {
            if (!ws.subscribedMarketIds.has(marketId)) {
                ws.subscribedMarketIds.add(marketId);
                addClient(marketId, ws);
                try {
                    await ensureSubscribe(marketId);
                }
                catch {
                    return sendSafe(ws, { type: 'error', error: 'redis_subscribe_failed', marketId });
                }
            }
            await sendSnapshot(ws, marketId);
            return sendSafe(ws, { type: 'subscribed', marketId });
        }
        if (type === 'unsubscribe' && marketId) {
            if (ws.subscribedMarketIds.has(marketId)) {
                ws.subscribedMarketIds.delete(marketId);
                removeClient(marketId, ws);
                try {
                    await ensureUnsubscribe(marketId);
                }
                catch { }
            }
            return sendSafe(ws, { type: 'unsubscribed', marketId });
        }
        return sendSafe(ws, { type: 'error', error: 'unknown_message' });
    });
    ws.on('close', async () => {
        const ids = Array.from(ws.subscribedMarketIds || []);
        for (const marketId of ids) {
            removeClient(marketId, ws);
            try {
                await ensureUnsubscribe(marketId);
            }
            catch { }
        }
    });
});
// Pub/Sub -> broadcast
sub.on('message', (channel, message) => {
    if (!channel.startsWith('market:') || !channel.endsWith(':updates'))
        return;
    const marketId = channel.replace(/^market:/, '').replace(/:updates$/, '');
    const clients = subscriptions.get(marketId);
    if (!clients || clients.size === 0)
        return;
    let data;
    try {
        data = JSON.parse(message);
    }
    catch {
        return;
    }
    for (const ws of clients) {
        sendSafe(ws, { type: 'update', marketId, data });
    }
});
// Heartbeat to kill dead sockets
const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        const c = ws;
        if (!c.isAlive) {
            try {
                c.terminate();
            }
            catch { }
            return;
        }
        c.isAlive = false;
        try {
            c.ping();
        }
        catch { }
    });
}, 30000);
wss.on('close', () => clearInterval(heartbeat));
console.log(`[wsServer] running on ws://0.0.0.0:${WS_PORT}/ws`);
if (require.main === module) {
    process.on('SIGINT', async () => {
        try {
            await sub.quit();
        }
        catch { console.warn('Failed to quit Redis subscription connection gracefully'); }
        try {
            await redis.quit();
        }
        catch { console.warn('Failed to quit Redis connection gracefully'); }
        process.exit(0);
    });
}
