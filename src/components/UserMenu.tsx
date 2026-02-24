"use client"

import { signOut } from 'next-auth/react'
import React from 'react'

export default function UserMenu({ user }: { user: { id: string; username?: string | null; email?: string | null; role?: string | null } | null }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a href="/signin" className="px-3 py-1 border rounded">Sign in</a>
        <a href="/register" className="px-3 py-1 bg-blue-600 text-white rounded">Register</a>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Hide username/email and role on small screens to avoid header overlap; show on md+ */}
      <div className="hidden md:flex flex-col text-sm min-w-0">
        <div className="font-medium truncate">{user.username ?? user.email}</div>
        <div className="text-xs text-gray-500 truncate">{user.email}</div>
      </div>
      <div className="hidden md:block px-2 py-1 text-xs font-semibold rounded bg-gray-100 flex-shrink-0">{user.role}</div>
      <button onClick={() => signOut({ callbackUrl: '/' })} className="px-3 py-1 border rounded">Logout</button>
    </div>
  )
}
