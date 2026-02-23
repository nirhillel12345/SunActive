import React from "react"
import { prisma } from "@/server/db/prisma"
import MarketBuyClient from "@/components/MarketBuyClient"
import getSession from "@/server/auth/getSession"
import Card from "@/components/ui/Card"

export default async function MarketPage({ params }) {
  const { id } = params

  const market = await prisma.market.findUnique({
    where: { id },
  })

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        Market not found
      </div>
    )
  }

  const session = await getSession()

  let user = null
  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: {
        id: true,
        username: true,
        balancePoints: true,
      },
    })
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

      {/* Title */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
          {market.question}
        </h1>

        {market.category && (
          <p className="text-sm text-gray-500 mt-2">
            {market.category}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* BUY CARD - ראשון במובייל, מתחת לVolume בדסקטופ */}
        <div className="order-1 lg:order-2 w-full">
          <MarketBuyClient
            market={market}
            user={user}
          />
        </div>

        {/* VOLUME CARD - מתחת במובייל, מעל בדסקטופ */}
        <div className="order-2 lg:order-1 w-full">
          <Card className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="text-sm text-gray-500">
              Liquidity
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {market.liquidity ?? "-"}
            </div>

            <div className="text-sm text-gray-500 mt-3">
              Volume:{" "}
              <span className="font-medium text-gray-800">
                {market.volume ?? 0}
              </span>
            </div>

            <div className="text-xs text-gray-400 mt-3">
              Updated: {new Date(market.updatedAt).toLocaleString()}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}