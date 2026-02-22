import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { mintPoints } from '@/server/services/mintService';
const BodySchema = z.object({ userId: z.string(), amount: z.number().int().positive(), note: z.string().optional() });
export async function POST(req) {
    const token = await getToken({ req: req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN')
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const data = BodySchema.parse(body);
        const adminId = token.userId;
        const newBalance = await mintPoints(adminId, data.userId, data.amount, data.note);
        return NextResponse.json({ success: true, balance: newBalance });
    }
    catch (err) {
        return NextResponse.json({ success: false, error: err?.message || 'Mint failed' }, { status: 400 });
    }
}
