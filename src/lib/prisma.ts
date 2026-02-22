import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: any
}

const _prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') global.prisma = _prisma

export const prisma: any = _prisma

export default prisma
