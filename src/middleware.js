import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
export async function middleware(req) {
    const { pathname } = req.nextUrl;
    // Protect /admin paths
    if (pathname.startsWith('/admin')) {
        const token = await getToken({ req: req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'ADMIN') {
            const url = req.nextUrl.clone();
            url.pathname = '/signin';
            return NextResponse.redirect(url);
        }
    }
    return NextResponse.next();
}
export const config = {
    matcher: ['/admin/:path*']
};
