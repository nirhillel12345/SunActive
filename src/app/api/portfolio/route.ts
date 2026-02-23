import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !token.userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const userId = String((token as any).userId)

  const [user, ledgers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, balancePoints: true } }),
    prisma.ledger.findMany({ where: { OR: [{ actorId: userId }, { targetUserId: userId }] }, orderBy: { createdAt: 'desc' }, take: 50 })
  ])

  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })

  return NextResponse.json({ ok: true, data: { user, ledgers } })
}
