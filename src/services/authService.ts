import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/prisma'

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function verifyPassword(plain: string, hashed: string) {
  return await bcrypt.compare(plain, hashed)
}

export async function createUser(username: string, email: string, password: string, role: 'ADMIN' | 'USER' = 'USER') {
  const passwordHash = await hashPassword(password)
  // Use a transaction to ensure uniqueness checks and creation are atomic
  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (existing) throw new Error('Email or username already in use')
    const user = await tx.user.create({ data: { username, email, passwordHash, role } })
    return user
  })
}
