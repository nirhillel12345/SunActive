import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { placeBet } from '@/server/services/betService'

const BodySchema = z.object({
  marketId: z.string().min(1),
  outcome: z.enum(['YES', 'NO']),
  amount: z.number().int().positive()
})

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !(token as any).userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const userId = String((token as any).userId)

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, { status: 400 })

  try {
    const { marketId, outcome, amount } = parsed.data
    const res = await placeBet(userId, marketId, outcome, amount)
    return NextResponse.json({ ok: true, data: res })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'error' }, { status: 400 })
  }
}
