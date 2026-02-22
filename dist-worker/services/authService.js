"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.verifyPassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("@/server/db/prisma");
async function hashPassword(password) {
    return await bcryptjs_1.default.hash(password, 10);
}
exports.hashPassword = hashPassword;
async function verifyPassword(plain, hashed) {
    return await bcryptjs_1.default.compare(plain, hashed);
}
exports.verifyPassword = verifyPassword;
async function createUser(username, email, password, role = 'USER') {
    const passwordHash = await hashPassword(password);
    // Use a transaction to ensure uniqueness checks and creation are atomic
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({ where: { OR: [{ email }, { username }] } });
        if (existing)
            throw new Error('Email or username already in use');
        const user = await tx.user.create({ data: { username, email, passwordHash, role } });
        return user;
    });
}
exports.createUser = createUser;
