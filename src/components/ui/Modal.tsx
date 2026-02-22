"use client"
import React, { useEffect } from 'react'

export default function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 z-60" onClick={onClose} />
      <div className="relative bg-white rounded shadow max-w-lg w-full p-6 z-70 mx-4 sm:mx-0">
        {children}
      </div>
    </div>
  )
}
