"use client"

import { useMemo, useState } from "react"
import MarketCard from "./MarketCard"
import Input from "./ui/Input"
import Drawer from "./ui/Drawer"
import Button from "./ui/Button"
import Skeleton from "./ui/Skeleton"

type Market = {
  id: string
  question?: string | null
  category?: string | null
  resolved?: boolean
  yesPrice?: number | null
  noPrice?: number | null
  probability?: number | null
  volume?: number | null
  imageUrl?: string | null
  updatedAt?: string
}

export default function MarketListClient({ initialMarkets }: { initialMarkets: Market[] }) {
  const [query, setQuery] = useState("")
  const [openOnly, setOpenOnly] = useState(false)
  const [category, setCategory] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading] = useState(false)

  const categories = useMemo(() => {
    const set = new Set<string>()
    initialMarkets.forEach((m) => {
      if (m.category) set.add(m.category)
    })
    return Array.from(set)
  }, [initialMarkets])

  const filtered = useMemo(() => {
    return initialMarkets.filter((m) => {
      if (openOnly && m.resolved) return false
      if (category && m.category !== category) return false
      const q = m.question ?? ""
      if (query && !q.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [initialMarkets, query, openOnly, category])

  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="mb-4 sm:mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: title + count */}
          <div className="flex items-baseline justify-between sm:justify-start gap-3">
            <div className="text-base sm:text-lg font-semibold text-gray-900">Markets</div>
            <div className="text-xs sm:text-sm text-gray-500">
              {filtered.length}
              <span className="hidden sm:inline"> results</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop search */}
            <div className="hidden sm:block w-[360px]">
              <Input
                placeholder="Search markets"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Mobile filters button */}
            <div className="sm:hidden w-full">
              <Button
                variant="secondary"
                onClick={() => setDrawerOpen(true)}
                className="w-full justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
              >
                Filters
              </Button>
            </div>

            {/* Desktop filters */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Category select */}
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* chevron */}
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Open only toggle */}
              <label className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 h-10 shadow-sm">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-4 focus:ring-gray-100"
                />
                <span className="text-sm text-gray-700 select-none">Open only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="mt-3 sm:hidden">
          <Input
            placeholder="Search markets"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="p-1">
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Filters</div>
            <Input
              label="Search"
              placeholder="Search markets"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 h-11 shadow-sm">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-4 focus:ring-gray-100"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-gray-900">Open only</span>
                <span className="text-xs text-gray-500">Hide resolved markets</span>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("")
                setCategory("")
                setOpenOnly(false)
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            >
              Reset
            </Button>
            <Button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 rounded-xl shadow-sm"
            >
              Apply
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl hidden sm:block" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 104.473 8.713l2.657 2.657a.75.75 0 101.06-1.06l-2.657-2.657A5.5 5.5 0 009 3.5zm-4 5.5a4 4 0 118 0 4 4 0 01-8 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-900">No markets found</div>
          <div className="mt-1 text-sm text-gray-500">
            Try a different search term or clear filters.
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("")
                setCategory("")
                setOpenOnly(false)
              }}
              className="rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            >
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
          {filtered.map((m) => (
            <MarketCard
              key={m.id}
              market={{
                id: m.id,
                question: m.question ?? undefined,
                category: m.category,
                resolved: m.resolved,
                volume: m.volume ?? 0,
                yesPrice: m.yesPrice ?? null,
                noPrice: m.noPrice ?? null,
                probability: m.probability ?? null,
                imageUrl: m.imageUrl ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}