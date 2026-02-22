"use client"

import React from "react"
import Link from "next/link"
import Card from "./ui/Card"
import Badge from "./ui/Badge"

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
}

export default function MarketCard({ market }: { market: Market }) {
  const { yesPrice, noPrice, volume, resolved, status, probability } = market

  const percent =
    probability != null
      ? Math.round(probability)
      : yesPrice != null
      ? Math.round(yesPrice * 100)
      : 0

  const percentColor =
    percent > 50
      ? "text-emerald-600"
      : percent < 50
      ? "text-rose-500"
      : "text-gray-800"

  return (
    <Link href={`/market/${market.id}`} className="block group">
      <Card className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50">

        <div className="flex justify-between gap-4">

          {/* LEFT SIDE */}
          <div className="flex flex-col flex-1">

            {/* Title */}
            <h3 className="text-[16px] font-medium leading-[1.35] text-gray-900 line-clamp-3">
              {market.title ?? market.question ?? "Untitled market"}
            </h3>

            {/* Category */}
            {market.category && (
              <div className="mt-2 text-xs text-gray-500">
                {market.category}
              </div>
            )}

            {/* Volume */}
            <div className="mt-4 text-xs text-gray-400 font-medium tracking-wide">
              ${((volume ?? 0) / 1_000_000).toFixed(1)}M Vol.
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col items-end shrink-0 w-[105px]">

            <Badge variant={resolved ? "muted" : "default"}>
              {resolved ? "Resolved" : status ?? "Open"}
            </Badge>

            <div className={`text-[28px] font-semibold leading-none mt-3 ${percentColor}`}>
              {percent ? `${percent}%` : "-"}
            </div>

            <div className="flex gap-2 mt-3">

              <div className="px-3 py-[6px] rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Yes {yesPrice != null ? `${Math.round(yesPrice * 100)}%` : ""}
              </div>

              <div className="px-3 py-[6px] rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                No {noPrice != null ? `${Math.round(noPrice * 100)}%` : ""}
              </div>

            </div>

          </div>
        </div>
      </Card>
    </Link>
  )
}