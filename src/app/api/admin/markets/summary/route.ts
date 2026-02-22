import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'ADMIN') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.market.count()
  const last = await prisma.market.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } })
  const rows = await prisma.market.findMany({ orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, question: true, category: true, resolved: true, liquidity: true, volume: true, updatedAt: true } })

  return NextResponse.json({ ok: true, count, updatedAt: last?.updatedAt ?? null, rows })
}
