import getSession from '@/server/auth/getSession'
import { prisma } from '@/server/db/prisma'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import AdminAgentsClient from '@/components/admin/AdminAgentsClient'

export default async function Page() {
  const session = await getSession()
  if (!((session as any)?.user?.id)) redirect('/signin')

  // verify admin role from DB
  const requester = await prisma.user.findUnique({ where: { id: String((session as any).user.id) }, select: { id: true, role: true } })
  if (!requester || requester.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Forbidden</h1>
        <Card>You must be an ADMIN to view this page.</Card>
      </div>
    )
  }

  const agents = await prisma.user.findMany({ where: { role: 'AGENT' }, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, email: true, balancePoints: true, createdAt: true } }) as any[]

  const agentsSerialized = agents.map((a) => ({ ...a, createdAt: a.createdAt?.toISOString?.() }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin — Agents</h1>
      <AdminAgentsClient initialAgents={agentsSerialized} />
    </div>
  )
}
