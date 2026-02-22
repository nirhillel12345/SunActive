"use client";
import React, { useState } from 'react';
import Drawer from './ui/Drawer';
import Button from './ui/Button';
export default function MobileNav({ user }) {
    const [open, setOpen] = useState(false);
    return (<>
      <Button variant="secondary" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">Menu</Button>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <a href="/" className="block p-3 rounded touch-manipulation hover:bg-gray-100">Markets</a>
          {user && user.role === 'USER' && <a href="/portfolio" className="block p-3 rounded touch-manipulation hover:bg-gray-100">Portfolio</a>}
          {user && user.role === 'ADMIN' && (<>
              <div className="font-semibold text-sm text-gray-500">Admin</div>
              <a href="/admin" className="block p-3 rounded touch-manipulation hover:bg-gray-100">Dashboard</a>
              <a href="/admin/users" className="block p-3 rounded touch-manipulation hover:bg-gray-100">Users</a>
              <a href="/admin/markets" className="block p-3 rounded touch-manipulation hover:bg-gray-100">Markets</a>
            </>)}
        </div>
      </Drawer>
    </>);
}
