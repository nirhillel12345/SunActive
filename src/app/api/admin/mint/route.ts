import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { mintPoints } from '@/server/services/mintService'

const BodySchema = z.object({ userId: z.string(), amount: z.number().int().positive(), note: z.string().optional() })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = BodySchema.parse(body)

    const adminId = (token as any).userId
    const newBalance = await mintPoints(adminId, data.userId, data.amount, data.note)

    return NextResponse.json({ success: true, balance: newBalance })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Mint failed' }, { status: 400 })
  }
}
