"use client"
import React, { useState, useMemo } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import { useToast } from './ui/ToastProvider'

export default function MarketBuyClient({ market, user }: any) {
  const toast = useToast()
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)

  const price = useMemo(() => {
    // Accept liquidity as a number (0..1) or percentage (0..100), or fall back to market.probability
    
    const raw = market?.liquidity ?? market?.probability ?? undefined
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0.5

    let p = n
    // if value looks like a percent (e.g. 35), convert to 0..1
    if (p > 1) {
      if (p <= 100) p = p / 100
      else return 1
    }

    // clamp to sensible bounds
    p = Math.max(0.01, Math.min(0.99, p))
    return p
  }, [market?.liquidity, market?.probability])

  // Debug: log incoming market values in dev so you can see what's passed in
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[MarketBuyClient] market values:', { liquidity: market?.liquidity, probability: market?.probability, computedPrice: price })
    }
  }, [market?.liquidity, market?.probability, price])

  const shares = typeof amount === 'number' && amount > 0 ? amount / price : 0
  const potentialPayout = shares * 1

  const disabled = loading || !amount || amount <= 0 || (user && user.balancePoints < amount)

  async function confirmBuy() {
    if (!amount || amount <= 0) return toast.push({ title: 'Invalid amount', type: 'error' })
    setLoading(true)
    try {
      const res = await fetch('/api/bet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketId: market.id, outcome, amount }) })
      const data = await res.json()
      if (!data.ok) {
        toast.push({ title: 'Bet failed', description: data.error || 'Unknown', type: 'error' })
      } else {
        toast.push({ title: 'Bet placed', description: `Placed ${amount} pts on ${outcome}` })
        // Optionally, keep the user on the page or redirect; we'll stay and reset inputs
        setAmount('')
      }
    } catch (e) {
      toast.push({ title: 'Network error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <button className={`px-3 py-2 rounded ${outcome === 'YES' ? 'bg-green-600 text-white' : 'bg-gray-100'}`} onClick={() => setOutcome('YES')}>YES</button>
        <button className={`px-3 py-2 rounded ${outcome === 'NO' ? 'bg-red-600 text-white' : 'bg-gray-100'}`} onClick={() => setOutcome('NO')}>NO</button>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Amount (pts)</label>
        <input type="number" min={1} value={amount as any} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-3 py-2" />
      </div>

      <div className="mb-3 text-sm text-gray-700">
        <div>Price (locked at purchase): <strong>{(price * 100).toFixed(0)}%</strong></div>
        <div>Shares: <strong>{shares ? shares.toFixed(4) : '0'}</strong></div>
        <div>Potential payout: <strong>{potentialPayout ? potentialPayout.toFixed(2) : '0'}</strong></div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={confirmBuy} disabled={disabled} className="min-h-[44px]">{loading ? 'Placing…' : `Buy ${outcome}`}</Button>
      </div>
    </Card>
  )
}
