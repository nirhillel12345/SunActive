import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /admin paths
  if (pathname.startsWith('/admin')) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || (token as any).role !== 'ADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/signin'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
