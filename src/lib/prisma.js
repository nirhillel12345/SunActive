import { PrismaClient } from '@prisma/client';
const _prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    global.prisma = _prisma;
export const prisma = _prisma;
export default prisma;
