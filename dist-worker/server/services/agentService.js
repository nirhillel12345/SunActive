"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentDeductFromUser = exports.agentMintToUser = exports.agentCreatePlayer = void 0;
const prisma_1 = require("@/server/db/prisma");
/**
 * Agent operations: mint to player, deduct from player, create player
 */
async function agentCreatePlayer(agentId, username, email, passwordHash) {
    if (!agentId)
        throw new Error('agentId required');
    if (!username || !email || !passwordHash)
        throw new Error('missing fields');
    return prisma_1.prisma.$transaction(async (tx) => {
        const agent = await tx.user.findUnique({ where: { id: agentId }, select: { id: true, role: true } });
        if (!agent || agent.role !== 'AGENT')
            throw new Error('unauthorized');
        const user = await tx.user.create({ data: { username, email, passwordHash, role: 'USER', agentId: agentId } });
        return user;
    });
}
exports.agentCreatePlayer = agentCreatePlayer;
async function agentMintToUser(agentId, userId, amount, note) {
    if (!agentId)
        throw new Error('agentId required');
    if (!userId)
        throw new Error('userId required');
    if (!Number.isInteger(amount) || amount <= 0)
        throw new Error('amount must be a positive integer');
    return prisma_1.prisma.$transaction(async (tx) => {
        const agent = await tx.user.findUnique({ where: { id: agentId }, select: { id: true, role: true, balancePoints: true } });
        if (!agent || agent.role !== 'AGENT')
            throw new Error('unauthorized');
        const player = await tx.user.findUnique({ where: { id: userId }, select: { id: true, agentId: true, balancePoints: true } });
        if (!player)
            throw new Error('player not found');
        if (player.agentId !== agentId)
            throw new Error('unauthorized');
        // Atomically decrement agent balance only if they have sufficient points to cover the mint
        const dec = await tx.user.updateMany({ where: { id: agentId, balancePoints: { gte: amount } }, data: { balancePoints: { decrement: amount } } });
        if (dec.count !== 1)
            throw new Error('INSUFFICIENT_AGENT_BALANCE');
        // Credit player
        const updatedPlayer = await tx.user.update({ where: { id: userId }, data: { balancePoints: { increment: amount } }, select: { balancePoints: true } });
        const updatedAgent = await tx.user.findUnique({ where: { id: agentId }, select: { balancePoints: true } });
        // Agent ledger (debit)
        await tx.ledger.create({ data: { actorId: agentId, targetUserId: agentId, type: 'AGENT_DEDUCT_FROM_USER', deltaPoints: -amount, referenceId: null } });
        // Player ledger (credit)
        await tx.ledger.create({ data: { actorId: agentId, targetUserId: userId, type: 'AGENT_MINT_TO_USER', deltaPoints: amount, referenceId: null } });
        return { agentBalance: updatedAgent.balancePoints, playerBalance: updatedPlayer.balancePoints };
    });
}
exports.agentMintToUser = agentMintToUser;
async function agentDeductFromUser(agentId, userId, amount, note) {
    if (!agentId)
        throw new Error('agentId required');
    if (!userId)
        throw new Error('userId required');
    if (!Number.isInteger(amount) || amount <= 0)
        throw new Error('amount must be a positive integer');
    return prisma_1.prisma.$transaction(async (tx) => {
        const agent = await tx.user.findUnique({ where: { id: agentId }, select: { id: true, role: true, balancePoints: true } });
        if (!agent || agent.role !== 'AGENT')
            throw new Error('unauthorized');
        const player = await tx.user.findUnique({ where: { id: userId }, select: { id: true, agentId: true, balancePoints: true } });
        if (!player)
            throw new Error('player not found');
        if (player.agentId !== agentId)
            throw new Error('unauthorized');
        // Atomically debit player only if they have enough balance
        const dec = await tx.user.updateMany({ where: { id: userId, balancePoints: { gte: amount } }, data: { balancePoints: { decrement: amount } } });
        if (dec.count !== 1)
            throw new Error('player has insufficient balance');
        // Credit agent
        const updatedAgent = await tx.user.update({ where: { id: agentId }, data: { balancePoints: { increment: amount } }, select: { balancePoints: true } });
        const updatedPlayer = await tx.user.findUnique({ where: { id: userId }, select: { balancePoints: true } });
        // Player ledger (debit)
        await tx.ledger.create({ data: { actorId: agentId, targetUserId: userId, type: 'AGENT_DEDUCT_FROM_USER', deltaPoints: -amount, referenceId: null } });
        // Agent ledger (credit)
        await tx.ledger.create({ data: { actorId: agentId, targetUserId: agentId, type: 'AGENT_MINT_TO_USER', deltaPoints: amount, referenceId: null } });
        return { agentBalance: updatedAgent.balancePoints, playerBalance: updatedPlayer.balancePoints };
    });
}
exports.agentDeductFromUser = agentDeductFromUser;
