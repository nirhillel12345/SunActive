import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/server/db/prisma'

const BodySchema = z.object({ agentId: z.string(), balancePoints: z.number().int().min(0) })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !(token as any).userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    // verify requester is admin from DB
    const requester = await prisma.user.findUnique({ where: { id: String((token as any).userId) }, select: { id: true, role: true } })
    if (!requester || requester.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    const data = BodySchema.parse(body)

    // ensure target is an agent
    const target = await prisma.user.findUnique({ where: { id: data.agentId }, select: { id: true, role: true } })
    if (!target || target.role !== 'AGENT') return NextResponse.json({ success: false, error: 'Target not an agent' }, { status: 400 })

    const updated = await prisma.user.update({ where: { id: data.agentId }, data: { balancePoints: data.balancePoints }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } })

    return NextResponse.json({ success: true, agent: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Update failed' }, { status: 400 })
  }
}
