import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { agentMintToUser } from '@/server/services/agentService'

const BodySchema = z.object({ userId: z.string(), amount: z.number().int().positive(), note: z.string().optional() })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'AGENT') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = BodySchema.parse(body)
    const agentId = (token as any).userId

    const res = await agentMintToUser(agentId, data.userId, data.amount, data.note)
    return NextResponse.json({ success: true, data: res })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Agent mint failed' }, { status: 400 })
  }
}
