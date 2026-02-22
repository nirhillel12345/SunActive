"use client"

import { useMemo, useState } from 'react'
import MarketCard from './MarketCard'
import Input from './ui/Input'
import Drawer from './ui/Drawer'
import Button from './ui/Button'
import Skeleton from './ui/Skeleton'

type Market = {
  id: string
  question: string
  category?: string | null
  resolved?: boolean
  liquidity?: number | null
  volume?: number | null
  updatedAt?: string
}

export default function MarketListClient({ initialMarkets }: { initialMarkets: Market[] }) {
  const [query, setQuery] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [category, setCategory] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading] = useState(false)

  const categories = useMemo(() => {
    const set = new Set<string>()
    initialMarkets.forEach((m) => { if (m.category) set.add(m.category) })
    return Array.from(set)
  }, [initialMarkets])

  const filtered = useMemo(() => {
    return initialMarkets.filter((m) => {
      if (openOnly && m.resolved) return false
      if (category && m.category !== category) return false
      if (query && !m.question.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [initialMarkets, query, openOnly, category])

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 hidden sm:block">
          <Input placeholder="Search question" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="sm:hidden">
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Filters</Button>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open only</label>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="mb-4">
          <Input label="Search" placeholder="Search question" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open only</label>
        </div>
      </Drawer>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        // mobile-first responsive grid: 1 / 2 / 3 / 4
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
          {filtered.map((m) => (
            <MarketCard key={m.id} market={{ id: m.id, title: m.question, question: m.question, category: m.category, resolved: m.resolved, volume: m.volume ?? 0, liquidity: m.liquidity ?? 0, probability:  Math.round((m.liquidity ?? 0) % 100) }} />
          ))}
        </div>
      )}
    </div>
  )
}
