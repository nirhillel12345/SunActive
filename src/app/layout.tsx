import './globals.css'
import React from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import MobileNav from '../components/MobileNav'
import getSession from '@/server/auth/getSession'
import { prisma } from '@/server/db/prisma'
import UserMenu from '../components/UserMenu'
import ToastProvider from '@/components/ui/ToastProvider'

export const metadata = {
  title: 'SunActive',
  description: 'SunActive app scaffold'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  let user: { id: string; username?: string | null; email?: string | null; role?: string | null } | null = null
  if ((session as any)?.user?.id) {
    const u = (await prisma.user.findUnique({ where: { id: String((session as any).user.id) } })) as any
    if (u) user = { id: u.id, username: u.username, email: u.email, role: u.role }
  }

  return (
    <html lang="en">
  <body className="min-h-screen bg-gray-50 text-gray-900">
        <ToastProvider>
  <div className="min-h-screen flex max-w-full">
          {/* Left sidebar - desktop */}
          <aside className="hidden md:block w-64 bg-gray-50 border-r p-4">
            <Card className="p-4 mb-4">
              <a href="/" className="text-xl font-bold">SunActive</a>
            </Card>
            <nav>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="block p-2 rounded hover:bg-gray-100">Markets</a>
                </li>
                {user && user.role === 'USER' && (
                  <li>
                    <a href="/portfolio" className="block p-2 rounded hover:bg-gray-100">Portfolio</a>
                  </li>
                )}
                {user && user.role === 'ADMIN' && (
                  <>
                    <li className="font-semibold text-sm text-gray-500 mt-4">Admin</li>
                    <li><a href="/admin" className="block p-2 rounded hover:bg-gray-100">Dashboard</a></li>
                    <li><a href="/admin/users" className="block p-2 rounded hover:bg-gray-100">Users</a></li>
                    <li><a href="/admin/markets" className="block p-2 rounded hover:bg-gray-100">Markets</a></li>
                  </>
                )}
              </ul>
            </nav>
          </aside>

          {/* Right content: allow vertical scrolling inside main */}
          <div className="flex-1 min-h-0 flex flex-col min-w-0">
            <header className="flex items-center justify-between bg-white border-b p-4">
              <div className="flex items-center gap-3 min-w-0">
                <MobileNav user={user} />
                <a href="/" className="text-lg font-bold">SunActive</a>
                <div className="hidden sm:block">
                  <div className="relative">
                    {/* responsive width to avoid overflow on smaller desktops */}
                    <input placeholder="Search markets..." className="border rounded px-3 py-1 max-w-[260px] w-full" />
                  </div>
                </div>
              </div>

              <div>
                <UserMenu user={user} />
              </div>
            </header>

            <main className="flex-1 overflow-auto p-6 max-w-7xl w-full mx-auto">{children}</main>
          </div>
        </div>
        </ToastProvider>
      </body>
    </html>
  )
}
