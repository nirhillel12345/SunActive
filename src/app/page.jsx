import getSession from '@/server/auth/getSession';
import { prisma } from '@/server/db/prisma';
import MarketListClient from '../components/MarketListClient';
export default async function Home() {
    const session = await getSession();
    const userRole = session?.user?.role ?? null;
    const markets = await prisma.market.findMany({ orderBy: { updatedAt: 'desc' }, take: 200, select: { id: true, question: true, category: true, resolved: true, liquidity: true, volume: true, updatedAt: true } });
    return (<div>
      <div className="mb-6">
        {!session ? (<div className="rounded-lg p-6 bg-white shadow">
            <h1 className="text-3xl font-bold">SunActive</h1>
            <p className="mt-2 text-gray-600">Explore markets and track your portfolio.</p>
            <div className="mt-4 flex gap-3">
              <a href="/signin" className="px-4 py-2 bg-blue-600 text-white rounded">Sign in</a>
              <a href="/register" className="px-4 py-2 border rounded">Register</a>
            </div>
          </div>) : (<div className="rounded-lg p-4 bg-white shadow flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Welcome back</h2>
              <p className="text-sm text-gray-600">Browse markets below.</p>
            </div>
            <div className="flex gap-3">
              {userRole === 'ADMIN' && (<>
                  <a href="/admin/users" className="px-3 py-2 bg-green-600 text-white rounded">Mint Points</a>
                  <a href="/admin/markets" className="px-3 py-2 border rounded">Sync Markets</a>
                </>)}
              {userRole === 'USER' && (<a href="/portfolio" className="px-3 py-2 bg-blue-600 text-white rounded">Your Portfolio</a>)}
            </div>
          </div>)}
      </div>

      <h3 className="text-xl font-semibold mb-4">Markets</h3>
      <MarketListClient initialMarkets={markets}/>
    </div>);
}
