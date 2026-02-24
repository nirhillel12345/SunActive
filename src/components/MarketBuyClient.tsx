"use client"

import React, { useEffect, useMemo, useState } from "react"
import Button from "./ui/Button"
import Card from "./ui/Card"
import { useToast } from "./ui/ToastProvider"

type Outcome = "YES" | "NO"

export default function MarketBuyClient({ market, user, initialPrices }: any) {
  const toast = useToast()

  const [side, setSide] = useState<Outcome>("YES")
  const [amount, setAmount] = useState<number | "">("")
  const [loading, setLoading] = useState(false)
  const [clientBalance, setClientBalance] = useState<number | null>(user?.balancePoints ?? null)

  // Live prices from WS/Redis (0..1)
  const [yesPrice, setYesPrice] = useState<number | null>(initialPrices?.yes ?? null)
  const [noPrice, setNoPrice] = useState<number | null>(initialPrices?.no ?? null)

  // Buy/Sell tab (UI only for now; logic remains Buy)
  const [tab, setTab] = useState<"BUY" | "SELL">("BUY")

  // Market-derived fallback price
  const fallbackYes = useMemo(() => {
    const raw = market?.probability ?? undefined
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0.5
    let p = n
    if (p > 1) {
      if (p <= 100) p = p / 100
      else p = 1
    }
    p = Math.max(0.01, Math.min(0.99, p))
    return p
  }, [market?.probability])

  const fallbackNo = useMemo(() => 1 - fallbackYes, [fallbackYes])

  // Selected price (prefer live)
  const selectedPrice = useMemo(() => {
    const live = side === "YES" ? yesPrice : noPrice
    const fallback = side === "YES" ? fallbackYes : fallbackNo
    const p = (live ?? fallback) as number | null
    if (p == null) return null
    const clamped = Math.max(0.0001, Math.min(0.9999, Number(p)))
    return Number.isFinite(clamped) ? clamped : null
  }, [side, yesPrice, noPrice, fallbackYes, fallbackNo])

  // Polymarket-style math:
  // shares = amount / avgPrice
  // toWin = shares * $1 (per share pays $1 if correct)
  const numericAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  const shares = selectedPrice && numericAmount > 0 ? numericAmount / selectedPrice : 0
  const toWin = shares // $1 per share (display as points/$ depending on your UI)

  const priceCents = selectedPrice != null ? selectedPrice * 100 : null

  const disabled =
    loading ||
    tab !== "BUY" ||
    !(typeof amount === "number" && amount > 0) ||
    !selectedPrice

  const quickAdd = (delta: number) => {
    setAmount((prev) => {
      const base = typeof prev === "number" && Number.isFinite(prev) ? prev : 0
      return Math.max(0, base + delta)
    })
  }

  const setMax = () => {
    const bal = Number(user?.balancePoints ?? 0)
    if (!Number.isFinite(bal) || bal <= 0) return
    setAmount(bal)
  }

  async function confirmBuy() {
    if (disabled) return
    setLoading(true)
    try {
      if (!selectedPrice) {
        toast.push({ title: "Price unavailable", type: "error" })
        return
      }

      // Keep request payload unchanged (do NOT break backend logic)
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId: market.id, outcome: side, amount }),
      })

      const data = await res.json()
      if (!data.ok) {
        toast.push({
          title: "Bet failed",
          description: data.error || "Unknown",
          type: "error",
        })
      } else {
        toast.push({
          title: "Bet placed",
          description: `Placed ${amount} pts on ${side}`,
        })
        setAmount("")
        // Refresh balance from server and emit a global event so the header updates immediately
        try {
          const r = await fetch('/api/portfolio')
          const j = await r.json()
          const newBal = Number(j?.data?.user?.balancePoints ?? NaN)
          if (!Number.isNaN(newBal)) {
            window.dispatchEvent(new CustomEvent('user:balance', { detail: { balance: newBal } }))
          } else {
            window.dispatchEvent(new CustomEvent('user:balance:refresh'))
          }
        } catch (e) {
          // best-effort: trigger refresh handler
          window.dispatchEvent(new CustomEvent('user:balance:refresh'))
        }
      }
    } catch {
      toast.push({ title: "Network error", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // WebSocket connection to internal WS server (unchanged logic)
  useEffect(() => {
    let ws: WebSocket | null = null
    let closed = false
    const port = (process.env.NEXT_PUBLIC_WS_PORT as string) || (window.location.port || "4001")
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const host =
      process.env.NEXT_PUBLIC_WS_URL || `${protocol}://${window.location.hostname}:${port}/ws`

    function connect() {
      try {
        ws = new WebSocket(host)
      } catch {
        ws = null
      }
      if (!ws) return

      ws.onopen = () => {
        try {
          ws?.send(JSON.stringify({ type: "subscribe", marketId: market.id }))
        } catch {}
      }

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data)
          if (
            (msg.type === "snapshot" || msg.type === "update") &&
            String(msg.marketId) === String(market.id)
          ) {
            const d = msg.data
            if (d) {
              // Preserve existing behavior; do not assume both exist.
              if (d.yes != null) setYesPrice(Number(d.yes))
              if (d.no != null) setNoPrice(Number(d.no))
            }
          }
        } catch {
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
      try {
        ws?.send(JSON.stringify({ type: "unsubscribe", marketId: market.id }))
      } catch {}
      try {
        ws?.close()
      } catch {}
    }
  }, [market?.id])

  // Maintain a client-side balance that updates after bets without page refresh
  useEffect(() => {
    let mounted = true
    async function fetchBal() {
      try {
        const res = await fetch('/api/portfolio')
        const j = await res.json()
        if (!mounted) return
        const b = Number(j?.data?.user?.balancePoints ?? NaN)
        if (!Number.isNaN(b)) setClientBalance(b)
      } catch {
        // ignore
      }
    }

    fetchBal()

    const handler = (ev: any) => {
      try {
        const b = Number(ev?.detail?.balance)
        if (!Number.isNaN(b)) setClientBalance(b)
      } catch {
        fetchBal()
      }
    }

    window.addEventListener('user:balance', handler as any)
    window.addEventListener('user:balance:refresh', fetchBal as any)
    return () => {
      mounted = false
      window.removeEventListener('user:balance', handler as any)
      window.removeEventListener('user:balance:refresh', fetchBal as any)
    }
  }, [])

  // REST fallback to fetch current price once if WS not available yet (unchanged)
  useEffect(() => {
    let cancelled = false
    if (yesPrice == null || noPrice == null) {
      fetch(`/api/market/${market.id}/price`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          if (data.ok && data.data) {
            if (data.data.yes != null) setYesPrice(Number(data.data.yes))
            if (data.data.no != null) setNoPrice(Number(data.data.no))
          }
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [market?.id]) // intentionally minimal deps

  // UI helpers
  const yesCents = yesPrice != null ? Math.round(yesPrice * 1000) / 10 : null // one decimal if needed
  const noCents = noPrice != null ? Math.round(noPrice * 1000) / 10 : null

  const activePill =
    side === "YES"
      ? "bg-emerald-600 text-white shadow-sm"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200"

  const inactivePill =
    side === "NO"
      ? "bg-rose-600 text-white shadow-sm"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200"

  return (
    <Card className="w-full p-8 lg:p-10 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
         </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("BUY")}
              className={`text-sm font-medium ${
                tab === "BUY" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setTab("SELL")}
              className={`text-sm font-medium ${
                tab === "SELL" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
              title="Sell UI can be added later"
            >
              Sell
            </button>
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          title="Order type"
        >
          Market <span className="ml-1">▾</span>
        </button>
      </div>

      {/* YES/NO pills */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className={`h-12 rounded-xl px-4 text-sm font-semibold transition ${activePill}`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            Yes{" "}
            <span className={side === "YES" ? "text-white/90" : "text-gray-500"}>
              {yesCents != null ? `${yesCents}¢` : "—"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSide("NO")}
          className={`h-12 rounded-xl px-4 text-sm font-semibold transition ${inactivePill}`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            No{" "}
            <span className={side === "NO" ? "text-white/90" : "text-gray-500"}>
              {noCents != null ? `${noCents}¢` : "—"}
            </span>
          </span>
        </button>
      </div>

      {/* Amount */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Amount</label>
          <div className="text-xs text-gray-400">Balance: {clientBalance != null ? clientBalance : Number(user?.balancePoints ?? 0)}</div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={amount as any}
            onChange={(e) =>
              setAmount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
            }
            className="w-full bg-transparent text-[28px] font-semibold leading-none text-gray-900 outline-none placeholder:text-gray-300"
            placeholder="0"
          />
          <div className="ml-3 text-[28px] font-semibold text-gray-900">$</div>
        </div>

        {/* Quick adds */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => quickAdd(1)}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            +$1
          </button>
          <button
            type="button"
            onClick={() => quickAdd(5)}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            +$5
          </button>
          <button
            type="button"
            onClick={() => quickAdd(10)}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            +$10
          </button>
          <button
            type="button"
            onClick={() => quickAdd(100)}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            +$100
          </button>
          <button
            type="button"
            onClick={setMax}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Max
          </button>
        </div>
      </div>

      {/* To win */}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-700">To win</div>
          <div className="mt-1 text-xs text-gray-500">
            Avg. Price{" "}
            <span className="font-medium text-gray-700">
              {priceCents != null ? `${Math.round(priceCents * 10) / 10}¢` : "—"}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[36px] font-semibold leading-none text-emerald-600">
            {numericAmount > 0 && selectedPrice ? `$${(toWin || 0).toFixed(2)}` : "$0"}
          </div>
        </div>
      </div>

      {/* Trade button */}
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={confirmBuy}
          disabled={disabled}
          className="w-full min-h-[52px] rounded-xl text-base font-semibold"
        >
          {loading ? "Placing…" : "Trade"}
        </Button>

        {tab === "SELL" && (
          <div className="mt-2 text-xs text-gray-500">
            Sell UI can be added later. (Buy logic unchanged.)
          </div>
        )}

        <div className="mt-3 text-xs text-gray-400">
          By trading, you agree to the <span className="underline">Terms of Use</span>.
        </div>
      </div>

      {/* Debug-style details (kept minimal; can remove later) */}
      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Price (locked at purchase)</span>
          <span className="font-semibold text-gray-800">
            {selectedPrice ? `$${(selectedPrice * 100).toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Shares</span>
          <span className="font-semibold text-gray-800">{shares ? shares.toFixed(4) : "0"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Potential payout</span>
          <span className="font-semibold text-gray-800">{toWin ? toWin.toFixed(4) : "0"}</span>
        </div>
      </div>
    </Card>
  )
}