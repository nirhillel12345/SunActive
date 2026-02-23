import getSession from '@/server/auth/getSession'
import { prisma } from '@/server/db/prisma'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import AgentDashboardClient from '@/components/AgentDashboardClient'

export default async function Page() {
  const session = await getSession()
  if (!((session as any)?.user?.id)) redirect('/signin')
  const userId = String((session as any).user.id)

  // enforce agent role server-side
  if ((session as any)?.user?.role !== 'AGENT') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Forbidden</h1>
        <Card>You do not have access to the Agent dashboard.</Card>
      </div>
    )
  }

  const agent = (await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } })) as any
  if (!agent) return <div className="text-center p-8">Agent not found</div>

  const players = (await prisma.user.findMany({ where: { agentId: userId }, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } })) as any[]

  // recent ledger activity for agent and their players
  const playerIds = players.map((p) => p.id)
  const ledgers = (await prisma.ledger.findMany({ where: { OR: [{ actorId: userId }, { targetUserId: userId }, { actorId: { in: playerIds } }, { targetUserId: { in: playerIds } }] }, orderBy: { createdAt: 'desc' }, take: 50 })) as any[]

  // stringify dates
  const agentSerialized = { ...agent, createdAt: agent.createdAt?.toISOString?.() }
  const playersSerialized = players.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString?.() }))
  const ledgersSerialized = ledgers.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Agent dashboard</h1>
      <AgentDashboardClient initialAgent={agentSerialized} initialPlayers={playersSerialized} initialLedgers={ledgersSerialized} />
    </div>
  )
}
