import React from 'react'
import { getMarketWithPrice } from '@/server/services/marketWithPrices'
import MarketBuyClient from '@/components/MarketBuyClient'
import getSession from '@/server/auth/getSession'
import Card from '@/components/ui/Card'

export default async function MarketPage({ params }: { params: { id: string } }) {
  const { id } = params
  const market = await getMarketWithPrice(id)
  if (!market) return <div className="p-6">Market not found</div>

  const session = await getSession()
  let user: any = null
  if ((session as any)?.user?.id) {
    user = await prisma.user.findUnique({ where: { id: String((session as any).user.id) }, select: { id: true, username: true, balancePoints: true } })
  }

  return (
    <div className="p-4 max-w-3xl w-full mx-auto">
      <h1 className="text-xl font-semibold mb-2">{market.question}</h1>
      <p className="text-sm text-gray-600 mb-4">{market.category ?? ''}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <Card>
            <div className="text-sm text-gray-500">Volume</div>
            <div className="text-lg font-semibold">{market.volume ?? '-'} </div>
            <div className="text-sm text-gray-500 mt-2">Updated: {market.updatedAt ? new Date(market.updatedAt).toLocaleString() : '-'}</div>
          </Card>
        </div>

        <div>
          <MarketBuyClient market={market} user={user} initialPrices={{ yes: market.yesPrice, no: market.noPrice }} />
        </div>
      </div>
    </div>
  )
}
