import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/server/db/prisma'
import bcrypt from 'bcryptjs'

const BodySchema = z.object({ username: z.string().min(3), email: z.string().email(), password: z.string().min(6), initialBalance: z.number().int().min(0).optional() })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !(token as any).userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    // validate admin role from DB (do not trust token role alone)
    const requestingUser = await prisma.user.findUnique({ where: { id: String((token as any).userId) }, select: { id: true, role: true } })
    if (!requestingUser || requestingUser.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    const data = BodySchema.parse(body)

    // prevent duplicate email
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 })

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({ data: { username: data.username, email: data.email, passwordHash, role: 'AGENT', balancePoints: data.initialBalance ?? 0 } , select: { id: true, username: true, email: true, role: true, balancePoints: true, createdAt: true } })

    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Create agent failed' }, { status: 400 })
  }
}
