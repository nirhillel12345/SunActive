const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin'
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'password123'

  const agentEmail = process.env.SEED_AGENT_EMAIL || 'agent@example.com'
  const agentUser = process.env.SEED_AGENT_USERNAME || 'agent'
  const agentPass = process.env.SEED_AGENT_PASSWORD || 'agentpass'

  const playerEmail = process.env.SEED_PLAYER_EMAIL || 'player@example.com'
  const playerUser = process.env.SEED_PLAYER_USERNAME || 'player'
  const playerPass = process.env.SEED_PLAYER_PASSWORD || 'playerpass'

  const adminHash = await bcrypt.hash(adminPass, 10)
  const agentHash = await bcrypt.hash(agentPass, 10)
  const playerHash = await bcrypt.hash(playerPass, 10)

  console.log('Seeding admin, agent and player...')

  await prisma.$transaction(async (tx) => {
    // Upsert admin (central bank)
    const admin = await tx.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        username: adminUser,
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        balancePoints: 100000
      }
    })

    // Upsert agent (distributor)
    const agent = await tx.user.upsert({
      where: { email: agentEmail },
      update: {},
      create: {
        username: agentUser,
        email: agentEmail,
        passwordHash: agentHash,
        role: 'AGENT',
        balancePoints: 1000
      }
    })

    // Upsert player and associate with agent
    const player = await tx.user.upsert({
      where: { email: playerEmail },
      update: {},
      create: {
        username: playerUser,
        email: playerEmail,
        passwordHash: playerHash,
        role: 'USER',
        balancePoints: 100,
        agentId: agent.id
      }
    })

    // Create ledger entries that reflect the above balances.
    // These ledger rows make the ledger consistent with the current balances so the ledger is a truthful audit trail.
    // Note: if you run migrations and regenerate Prisma client, you can remove any `as any` casts if required.

    // Admin -> Agent (initial top-up)
    await tx.ledger.create({ data: { actorId: admin.id, targetUserId: agent.id, type: 'ADMIN_MINT_TO_AGENT', deltaPoints: agent.balancePoints, referenceId: null } })

    // Agent -> Player (agent funded the player)
    await tx.ledger.create({ data: { actorId: agent.id, targetUserId: player.id, type: 'AGENT_MINT_TO_USER', deltaPoints: player.balancePoints, referenceId: null } })
  })

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
