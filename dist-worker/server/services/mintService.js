"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintPoints = void 0;
const prisma_1 = require("@/server/db/prisma");
/**
 * Mint points from an admin to a user.
 * All DB changes are performed inside a single transaction.
 * Returns the updated user balance (number).
 */
async function mintPoints(adminId, userId, amount, note) {
    if (!adminId)
        throw new Error('adminId required');
    if (!userId)
        throw new Error('userId required');
    if (!Number.isInteger(amount) || amount <= 0)
        throw new Error('amount must be a positive integer');
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        // verify admin exists and has ADMIN role
        const admin = await tx.user.findUnique({ where: { id: adminId }, select: { id: true, role: true } });
        if (!admin || admin.role !== 'ADMIN')
            throw new Error('unauthorized');
        // ensure recipient exists
        const recipient = await tx.user.findUnique({ where: { id: userId }, select: { id: true, balancePoints: true } });
        if (!recipient)
            throw new Error('recipient not found');
        // create AdminMint record
        const adminMint = await tx.adminMint.create({ data: { adminId, userId, amount, note } });
        // create Ledger entry referencing the adminMint
        await tx.ledger.create({ data: { userId, type: 'MINT', deltaPoints: amount, referenceId: adminMint.id } });
        // update user balance
        const updated = await tx.user.update({ where: { id: userId }, data: { balancePoints: { increment: amount } }, select: { balancePoints: true } });
        return updated.balancePoints;
    });
    return result;
}
exports.mintPoints = mintPoints;
