import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  try {
    const key = `market:${id}`
    const raw = await redis.get(key)
    if (!raw) return NextResponse.json({ ok: false, error: 'price unavailable' }, { status: 404 })
    const data = JSON.parse(raw)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'error' }, { status: 500 })
  }
}
