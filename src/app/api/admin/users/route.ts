import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'ADMIN') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true, balancePoints: true, createdAt: true } })
  return NextResponse.json({ ok: true, users })
}
