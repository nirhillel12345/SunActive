import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { syncMarkets } from '@/server/services/marketService'

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token as any).role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const imported = await syncMarkets()
    return NextResponse.json({ success: true, imported })
  } catch (e: any) {
    console.error('syncMarkets error', e)
    return NextResponse.json({ success: false, error: e.message || 'sync error' }, { status: 500 })
  }
}
