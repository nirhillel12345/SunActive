"use client"
import React, { useState, useMemo, useEffect } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import { useToast } from './ui/ToastProvider'

export default function MarketBuyClient({ market, user, initialPrices }: any) {
  const toast = useToast()
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)

  // Live prices from WS/Redis
  const [yesPrice, setYesPrice] = useState<number | null>(initialPrices?.yes ?? null)
  const [noPrice, setNoPrice] = useState<number | null>(initialPrices?.no ?? null)

  // Market-derived fallback price (from liquidity or probability)
  const fallbackPrice = useMemo(() => {
    // DB should not store prices; if there's a probability field it may be present from older runs.
    const raw = market?.probability ?? undefined
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0.5
    let p = n
    if (p > 1) {
      if (p <= 100) p = p / 100
      else return 1
    }
    p = Math.max(0.01, Math.min(0.99, p))
    return p
  }, [market?.probability])

  // computed derived price used for the selected outcome (prefer live prices)
  const selectedPrice = useMemo(() => {
    const live = outcome === 'YES' ? yesPrice : noPrice
    return (live ?? fallbackPrice) as number | null
  }, [yesPrice, noPrice, fallbackPrice, outcome])

  // shares & payout (only when price known)
  const shares = typeof amount === 'number' && amount > 0 && selectedPrice ? amount / selectedPrice : 0
  const potentialPayout = shares * 1

  // whether the buy button should be disabled
  const disabled = loading || !(typeof amount === 'number' && amount > 0) || !selectedPrice

  // confirm buy action
  async function confirmBuy() {
    if (disabled) return
    setLoading(true)
    try {
      if (!selectedPrice) return toast.push({ title: 'Price unavailable', type: 'error' })
      const res = await fetch('/api/bet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketId: market.id, outcome, amount }) })
      const data = await res.json()
      if (!data.ok) {
        toast.push({ title: 'Bet failed', description: data.error || 'Unknown', type: 'error' })
      } else {
        toast.push({ title: 'Bet placed', description: `Placed ${amount} pts on ${outcome}` })
        setAmount('')
      }
    } catch (e) {
      toast.push({ title: 'Network error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // WebSocket connection to internal WS server
  useEffect(() => {
    let ws: WebSocket | null = null
    let closed = false
    const port = (process.env.NEXT_PUBLIC_WS_PORT as string) || (window.location.port || '4001')
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = process.env.NEXT_PUBLIC_WS_URL || `${protocol}://${window.location.hostname}:${port}/ws`

    function connect() {
      try {
        console.log(`Connecting to WS server at ${host} for market ${market.id} price updates`)
        ws = new WebSocket(host)
      } catch (e) {
        ws = null
      }
      if (!ws) return

      ws.onopen = () => {
        try { ws?.send(JSON.stringify({ type: 'subscribe', marketId: market.id })) } catch (e) {}
      }

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data)
          if ((msg.type === 'snapshot' || msg.type === 'update') && String(msg.marketId) === String(market.id)) {
            const d = msg.data
            if (d) {
              setYesPrice(Number(d.yes))
              setNoPrice(Number(d.no))
            }
          }
        } catch (e) {
          // ignore
        }
      }

      ws.onclose = () => {
        if (closed) return
        setTimeout(() => connect(), 1000)
      }

      ws.onerror = () => {
        // ignore
      }
    }

    connect()

    return () => {
      closed = true
      try { ws?.send(JSON.stringify({ type: 'unsubscribe', marketId: market.id })) } catch (e) {}
      try { ws?.close() } catch (e) {}
    }
  }, [market?.id])

  // REST fallback to fetch current price once if WS not available yet
  useEffect(() => {
    let cancelled = false
    if (yesPrice == null || noPrice == null) {
      fetch(`/api/market/${market.id}/price`).then((r) => r.json()).then((data) => {
        if (cancelled) return
        if (data.ok && data.data) {
          setYesPrice(Number(data.data.yes))
          setNoPrice(Number(data.data.no))
        }
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [market?.id])

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
        <div>Price (locked at purchase): <strong>{selectedPrice ? `${(selectedPrice * 100).toFixed(0)}%` : '—'}</strong></div>
        <div>Shares: <strong>{shares ? shares.toFixed(4) : '0'}</strong></div>
        <div>Potential payout: <strong>{potentialPayout ? potentialPayout.toFixed(2) : '0'}</strong></div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={confirmBuy} disabled={disabled} className="min-h-[44px]">{loading ? 'Placing…' : `Buy ${outcome}`}</Button>
      </div>
    </Card>
  )
}
