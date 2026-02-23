import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/server/db/prisma'

const BodySchema = z.object({ username: z.string(), email: z.string().email(), passwordHash: z.string() })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = BodySchema.parse(body)

    const user = await prisma.user.create({ data: { username: data.username, email: data.email, passwordHash: data.passwordHash, role: 'AGENT', balancePoints: 0 } })
    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Create agent failed' }, { status: 400 })
  }
}
