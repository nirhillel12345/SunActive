import React from "react"
import { prisma } from "@/server/db/prisma"
import { getMarketWithPrice } from "@/server/services/marketWithPrices"
import MarketBuyClient from "@/components/MarketBuyClient"
import getSession from "@/server/auth/getSession"
import Card from "@/components/ui/Card"

export default async function MarketPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const market = await getMarketWithPrice(id)
  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        Market not found
      </div>
    )
  }

  const session = await getSession()
  let user: any = null

  if ((session as any)?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: String((session as any).user.id) },
      select: {
        id: true,
        username: true,
        balancePoints: true,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      {/* Image */}
          
        {/* Title */}
        <div className="mb-8">
         <div className="flex flex-row sm:flex-row sm:items-start gap-4">
  {market.imageUrl && (
    <div className="w-12 h-20 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 mx-auto sm:mx-0">
      <img
        src={market.imageUrl}
        alt="market"
        className="w-full h-full object-cover"
      />
    </div>
  )}

  <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
    {market.question}
  </h1>
</div>

          {market.category && (
            <p className="text-sm text-gray-500 mt-2">
              {market.category}
            </p>
          )}
        </div>

        {/* BUY CARD – Full Width */}
        <div className="w-full mb-8">
          <MarketBuyClient
            market={market}
            user={user}
            initialPrices={{
              yes: market.yesPrice,
              no: market.noPrice,
            }}
          />
        </div>

        {/* VOLUME CARD – Always Below */}
        <div className="w-full">
          <Card className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="text-sm text-gray-500">
              Volume
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {market.volume ?? "-"}
            </div>

            <div className="text-sm text-gray-500 mt-3">
              Updated:
              <span className="ml-1 font-medium text-gray-800">
                {market.updatedAt
                  ? new Date(market.updatedAt).toLocaleString()
                  : "-"}
              </span>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}