"use client"
import React from 'react'
import Link from 'next/link'
import Card from './ui/Card'
import Badge from './ui/Badge'

type Market = {
  id: string
  title?: string | null
  question?: string | null
  category?: string | null
  resolved?: boolean
  liquidity?: number | null
  volume?: number | null
  status?: string | null
  probability?: number | null
}

export default function MarketCard({ market }: { market: Market }) {
  return (
    <Link href={`/market/${market.id}`} className="block">
      <Card className="hover:shadow-md transition min-h-[96px] overflow-hidden w-full">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-sm line-clamp-2 break-words">{market.title ?? market.question ?? 'Untitled market'}</h3>
            <p className="text-xs text-gray-600 mt-2 text-ellipsis break-words">{market.category ?? ''}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={market.resolved ? 'muted' : 'default'}>{market.resolved ? 'Resolved' : (market.status ?? 'Open')}</Badge>
            <div className="text-right">
              <div className="text-sm font-semibold">{market.probability ? `${market.probability.toFixed(0)}%` : '-'}</div>
              <div className="text-xs text-gray-500">Vol ${(market.volume ?? 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
