const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin'
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'password123'

  const userEmail = process.env.SEED_USER_EMAIL || 'user@example.com'
  const userName = process.env.SEED_USER_USERNAME || 'user'
  const userPass = process.env.SEED_USER_PASSWORD || 'password123'
  const adminHash = await bcrypt.hash(adminPass, 10)
  const userHash = await bcrypt.hash(userPass, 10)

  console.log('Seeding admin and user...')

  await prisma.$transaction(async (tx) => {
    // upsert admin
    await tx.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        username: adminUser,
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        balancePoints: 1000
      }
    })

    await tx.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        username: userName,
        email: userEmail,
        passwordHash: userHash,
        role: 'USER',
        balancePoints: 100
      }
    })
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
