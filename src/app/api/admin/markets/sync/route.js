import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { syncMarkets } from '@/server/services/marketService';
export async function POST(req) {
    const token = await getToken({ req: req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN')
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    try {
        const imported = await syncMarkets();
        return NextResponse.json({ success: true, imported });
    }
    catch (e) {
        console.error('syncMarkets error', e);
        return NextResponse.json({ success: false, error: e.message || 'sync error' }, { status: 500 });
    }
}
