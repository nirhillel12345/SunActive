import getSession from '@/server/auth/getSession'
import { getMarketsWithPrices } from '@/server/services/marketWithPrices'

import MarketListClient from '../components/MarketListClient'

export default async function Home() {
  const session = await getSession()
  const userRole = (session as any)?.user?.role ?? null

  const markets = await getMarketsWithPrices({ take: 200 })

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Markets</h3>
      <MarketListClient initialMarkets={markets} />
    </div>
  )
}
