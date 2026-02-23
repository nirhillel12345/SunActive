import getSession from '@/server/auth/getSession'
import { prisma } from '@/server/db/prisma'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'

export default async function Portfolio() {
  const session = await getSession()
  if (!((session as any)?.user?.id)) {
    redirect('/signin')
  }

  const userId = String((session as any).user.id)
  const user = (await prisma.user.findUnique({ where: { id: userId } })) as any
  if (!user) return <div className="text-center p-8">User not found</div>

  const ledgers = await (prisma as any).ledger.findMany({ where: { OR: [{ actorId: userId }, { targetUserId: userId }] }, orderBy: { createdAt: 'desc' }, take: 50 }) as any[]
  const openBets = await (prisma as any).bet.findMany({ where: { userId, status: 'OPEN' }, include: { market: true }, orderBy: { createdAt: 'desc' } }) as any[]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Portfolio</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-1">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-2xl font-semibold">{user.balancePoints} pts</div>
          <div className="text-xs text-gray-500 mt-2">Member since {new Date(user.createdAt).toLocaleDateString()}</div>
        </Card>

        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <div className="space-y-2">
            {ledgers.map((l) => (
              <div key={l.id} className="p-3 border rounded flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">{new Date(l.createdAt).toLocaleString()}</div>
                  <div className="font-medium">{l.type} — {l.deltaPoints > 0 ? '+' : ''}{l.deltaPoints}</div>
                  {l.referenceId && <div className="text-xs text-gray-500">ref: {l.referenceId}</div>}
                </div>
                <div className={`text-sm font-semibold ${l.deltaPoints > 0 ? 'text-green-600' : 'text-red-600'}`}>{l.deltaPoints > 0 ? `+${l.deltaPoints}` : l.deltaPoints}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="md:col-span-2 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Open bets</h2>
          </div>
          <div className="space-y-2">
            {openBets.length === 0 && <div className="text-sm text-gray-500">No open bets</div>}
            {openBets.map((b) => (
              <div key={b.id} className="p-3 border rounded flex items-start justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{b.market?.question ?? b.marketId}</div>
                  <div className="text-xs text-gray-500">Staked: {b.amountStaked} pts • Shares: {Number(b.shares).toFixed(4)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{Number(b.potentialPayout).toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">{b.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
