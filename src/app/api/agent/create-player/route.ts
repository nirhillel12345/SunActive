import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { agentCreatePlayer } from '@/server/services/agentService'

const BodySchema = z.object({ username: z.string(), email: z.string().email(), passwordHash: z.string() })

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'AGENT') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = BodySchema.parse(body)
    const agentId = (token as any).userId

    const user = await agentCreatePlayer(agentId, data.username, data.email, data.passwordHash)
    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Create player failed' }, { status: 400 })
  }
}
