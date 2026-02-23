"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBet = void 0;
const prisma_1 = require("@/server/db/prisma");
const redis_1 = __importDefault(require("@/lib/redis"));
function parsePrice(raw) {
    let obj;
    try {
        obj = JSON.parse(raw);
    }
    catch {
        throw new Error('price parse error');
    }
    const yes = Number(obj?.yes);
    const no = Number(obj?.no);
    if (!Number.isFinite(yes) || !Number.isFinite(no))
        throw new Error('invalid price data');
    if (yes <= 0 || yes >= 1 || no <= 0 || no >= 1)
        throw new Error('invalid price bounds');
    return { yes, no };
}
/**
 * Place a bet for a user on a market outcome.
 * Locks price from Redis. Client never supplies price.
 * Uses atomic balance decrement to prevent race conditions.
 */
async function placeBet(userId, marketId, outcome, amount) {
    if (!userId)
        throw new Error('userId required');
    if (!marketId)
        throw new Error('marketId required');
    if (!Number.isInteger(amount) || amount <= 0)
        throw new Error('amount must be a positive integer');
    // Read price snapshot from Redis
    const raw = await redis_1.default.get(`market:${marketId}`);
    if (!raw)
        throw new Error('price unavailable');
    const { yes, no } = parsePrice(raw);
    const priceLocked = outcome === 'YES' ? yes : no;
    const shares = amount / priceLocked;
    const potentialPayout = shares * 1;
    return prisma_1.prisma.$transaction(async (tx) => {
        const market = await tx.market.findUnique({
            where: { id: String(marketId) },
            select: { id: true, resolved: true },
        });
        if (!market)
            throw new Error('market not found');
        if (market.resolved)
            throw new Error('market already resolved');
        // Atomic decrement only if balancePoints >= amount (prevents concurrent overspend)
        const dec = await tx.user.updateMany({
            where: { id: String(userId), balancePoints: { gte: amount } },
            data: { balancePoints: { decrement: amount } },
        });
        if (dec.count !== 1)
            throw new Error('insufficient balance');
        const updatedUser = await tx.user.findUnique({
            where: { id: String(userId) },
            select: { balancePoints: true },
        });
        if (!updatedUser)
            throw new Error('user not found');
        const bet = await tx.bet.create({
            data: {
                userId: String(userId),
                marketId: market.id,
                outcome: outcome,
                amountStaked: amount,
                priceLocked,
                shares,
                potentialPayout,
                status: 'OPEN',
            },
            select: { id: true },
        });
        await tx.ledger.create({ data: { actorId: String(userId), targetUserId: String(userId), type: 'BET_PLACE', deltaPoints: -amount, referenceId: bet.id } });
        return {
            betId: bet.id,
            shares,
            potentialPayout,
            priceLocked,
            newBalance: updatedUser.balancePoints,
        };
    });
}
exports.placeBet = placeBet;
