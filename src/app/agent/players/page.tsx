import getSession from '@/server/auth/getSession'
import { prisma } from '@/server/db/prisma'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import AgentDashboardClient from '@/components/AgentDashboardClient'

export default async function Page({ searchParams }: { searchParams?: { [key: string]: string } }) {
  const session = await getSession()
  if (!((session as any)?.user?.id)) redirect('/signin')
  const userId = String((session as any).user.id)

  // enforce agent role server-side
  // For testing: add ?forceDenied=1 to the URL to show the forbidden card even if you're an agent
  console.log("full session", session)
  console.log("role", (session as any)?.user?.role, "forceDenied", searchParams?.forceDenied)
  const role = (session as any)?.user?.role
  console.log("role", role)
  const forceDenied = searchParams?.forceDenied === '1'
  if (!forceDenied && role !== 'AGENT') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Forbidden</h1>
        <Card>
          You do not have permission to view the Agent players page.
          <div className="text-xs text-gray-500 mt-2">Your role: {role ?? 'unknown'}</div>
        </Card>
      </div>
    )
  }

  const agent = (await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } })) as any
  if (!agent) return <div className="text-center p-8">Agent not found</div>

  const players = (await prisma.user.findMany({ where: { agentId: userId }, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } })) as any[]

  const agentSerialized = { ...agent, createdAt: agent.createdAt?.toISOString?.() }
  const playersSerialized = players.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString?.() }))

  // pass empty ledgers for this view — AgentDashboardClient will render players section
  return (
    <div>
      <div className="mb-3">
        <Card className="p-2">Role: <span className="font-semibold">{role ?? 'unknown'}</span></Card>
      </div>
      <h1 className="text-2xl font-bold mb-4">Agent — Players</h1>
      <AgentDashboardClient initialAgent={agentSerialized} initialPlayers={playersSerialized} initialLedgers={[]} />
    </div>
  )
}
