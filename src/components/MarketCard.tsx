"use client"

import React from "react"
import Link from "next/link"

type Market = {
  id: string
  title?: string | null
  question?: string | null
  category?: string | null
  resolved?: boolean
  volume?: number | null
  status?: string | null
  yesPrice?: number | null
  noPrice?: number | null
  probability?: number | null
  imageUrl?: string | null
}

export default function MarketCard({ market }: { market: Market }) {
  const {
    yesPrice,
    noPrice,
    volume,
    probability,
    imageUrl,
  } = market
  const percent =
    probability != null
      ? Math.round(probability)
      : yesPrice != null
      ? Math.round(yesPrice * 100)
      : 0

  const yesPercent =
    yesPrice != null ? Math.round(yesPrice * 100) : percent

  const noPercent =
    noPrice != null ? Math.round(noPrice * 100) : 100 - percent

  const percentColor =
    percent > 50
      ? "text-emerald-600"
      : percent < 50
      ? "text-rose-500"
      : "text-gray-800"

  return (
    <Link href={`/market/${market.id}`} className="block">
      <div className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition">

        <div className="flex gap-4">

          {/* Image */}
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="market"
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* Content */}
          <div className="flex-1">

            {/* Title */}
            <h3 className="text-[15px] font-medium text-gray-900 leading-snug line-clamp-2">
              {market.title ?? market.question ?? "Untitled market"}
            </h3>

            {/* YES / NO Row */}
            <div className="flex items-center gap-3 mt-3">

             <div className="inline-flex items-center px-3 py-1 rounded-md bg-emerald-100">
              <span className="text-sm font-semibold text-emerald-700">
                Yes {yesPercent}%
              </span>
            </div>

              <div className="inline-flex items-center px-3 py-1 rounded-md bg-rose-100">
              <span className="text-sm font-semibold text-rose-700">
                No {noPercent}%
              </span>
            </div>

            </div>

            {/* Volume */}
            <div className="text-xs text-gray-400 mt-3">
              ${((volume ?? 0) / 1_000_000).toFixed(1)}M Vol.
            </div>

          </div>
        </div>
      </div>
    </Link>
  )
}