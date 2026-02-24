"use client"

import React, { useEffect, useState } from 'react'

export default function UserBalance({ className = '' }: { className?: string }) {
  const [balance, setBalance] = useState<number | null>(null)

  async function fetchBalance() {
    try {
      const res = await fetch('/api/portfolio')
      console.log('fetchBalance response', res) 
      const j = await res.json()
      if (j?.ok && j?.data?.user) {
        setBalance(Number(j.data.user.balancePoints ?? 0))
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchBalance()

    const handler = (ev: any) => {
      try {
        const b = Number(ev?.detail?.balance)
        if (!Number.isNaN(b)) setBalance(b)
      } catch {
        // ignore
      }
    }

    const refreshHandler = () => fetchBalance()

    window.addEventListener('user:balance', handler as any)
    window.addEventListener('user:balance:refresh', refreshHandler as any)
    return () => {
      window.removeEventListener('user:balance', handler as any)
      window.removeEventListener('user:balance:refresh', refreshHandler as any)
    }
  }, [])

  if (balance == null) return <span className={className}>Balance: -</span>
  return (
    <span className={className}>
      Balance: <span className="font-medium">{balance} pts</span>
    </span>
  )
}
