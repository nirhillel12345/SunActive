"use client"

import { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import Skeleton from './ui/Skeleton'
import { useToast } from './ui/ToastProvider'

type MarketRow = {
  id: string
  question: string
  category?: string | null
  resolved?: boolean
  liquidity?: number | null
  volume?: number | null
  updatedAt?: string
}

export default function AdminMarketsClient({ initialCount, initialUpdatedAt, initialRows }: { initialCount: number, initialUpdatedAt?: string | null, initialRows: MarketRow[] }) {
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt ?? null)
  const [rows, setRows] = useState<MarketRow[]>(initialRows)
  const toast = useToast()

  async function handleSync() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/markets/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const s = await fetch('/api/admin/markets/summary')
        const sd = await s.json()
        setCount(sd.count)
        setUpdatedAt(sd.updatedAt)
        setRows(sd.rows)
        toast.push({ title: 'Sync complete', description: `Imported ${sd.count} markets`, type: 'success' })
      } else {
        toast.push({ title: 'Sync failed', description: data.error || 'unknown', type: 'error' })
      }
    } catch (e) {
      toast.push({ title: 'Network error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="primary" onClick={handleSync} disabled={loading}>{loading ? 'Syncing…' : 'Sync Markets'}</Button>
        <div>Total markets: <strong>{count}</strong></div>
        <div>Last updated: <strong>{updatedAt ?? 'n/a'}</strong></div>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <>
            <table className="w-full table-auto border-collapse hidden sm:table">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Question</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Resolved</th>
                  <th className="p-2">Liquidity</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.question}</td>
                    <td className="p-2">{r.category ?? '-'}</td>
                    <td className="p-2">{r.resolved ? 'Yes' : 'Open'}</td>
                    <td className="p-2">{r.liquidity ?? '-'}</td>
                    <td className="p-2">{r.volume ?? '-'}</td>
                    <td className="p-2">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-3 sm:hidden p-2">
              {rows.map((r) => (
                <div key={r.id} className="p-3 border rounded">
                  <div className="font-medium line-clamp-2">{r.question}</div>
                  <div className="text-xs text-gray-500 mt-1">{r.category ?? '-'}</div>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <div className="text-xs">{r.resolved ? 'Resolved' : 'Open'}</div>
                    <div className="text-xs">Vol: {r.volume ?? '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
