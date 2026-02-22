import { prisma } from '@/server/db/prisma'
import Card from '@/components/ui/Card'

export default async function AdminPage() {
  const totalUsers = await prisma.user.count()
  const totalMarkets = await (prisma as any).market.count()
  const lastMarket = await (prisma as any).market.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-sm text-gray-500">Total users</div>
          <div className="text-2xl font-semibold">{totalUsers}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total markets</div>
          <div className="text-2xl font-semibold">{totalMarkets}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Last markets sync</div>
          <div className="text-base">{lastMarket?.updatedAt ? new Date(lastMarket.updatedAt).toLocaleString() : 'n/a'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/admin/users"><Card className="hover:shadow-md"><div className="font-semibold">Manage users</div><div className="text-sm text-gray-500">Mint points and review users</div></Card></a>
        <a href="/admin/markets"><Card className="hover:shadow-md"><div className="font-semibold">Sync markets</div><div className="text-sm text-gray-500">Sync markets with Polymarket REST</div></Card></a>
      </div>
    </div>
  )
}
