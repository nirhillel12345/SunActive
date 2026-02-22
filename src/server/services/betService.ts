import { prisma } from '@/server/db/prisma'

/**
 * Place a bet for a user on a market outcome.
 * All DB changes are done inside a single Prisma transaction.
 */
export async function placeBet(userId: string, marketId: string, outcome: 'YES' | 'NO', amount: number) {
  if (!userId) throw new Error('userId required')
  if (!marketId) throw new Error('marketId required')
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) throw new Error('amount must be a positive integer')

  const result = await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findUnique({ where: { id: String(userId) } })
    if (!user) throw new Error('user not found')

    const market = await tx.market.findUnique({ where: { id: String(marketId) } })
    if (!market) throw new Error('market not found')
    if (market.resolved) throw new Error('market already resolved')

    if (user.balancePoints < amount) throw new Error('insufficient balance')

    // derive a price placeholder: use market.liquidity if it's a sensible probability (0..1), else fallback 0.5
    let price = 0.5
    if (typeof market.liquidity === 'number' && market.liquidity > 0 && market.liquidity <= 1) {
      price = market.liquidity
    }

    // Lock price at time of bet
    const priceLocked = price

    // shares and potential payout (we treat 1 as full payout per share)
    const shares = amount / priceLocked
    const potentialPayout = shares * 1

    // Deduct balance and create bet + ledger
    const updatedUser = await tx.user.update({ where: { id: user.id }, data: { balancePoints: { decrement: amount } } })

    const bet = await tx.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        outcome: outcome,
        amountStaked: amount,
        priceLocked,
        shares,
        potentialPayout,
        status: 'OPEN'
      }
    })

    await tx.ledger.create({
      data: {
        userId: user.id,
        type: 'BET_PLACE',
        deltaPoints: -amount,
        referenceId: bet.id
      }
    })

    return {
      betId: bet.id,
      shares,
      potentialPayout,
      newBalance: updatedUser.balancePoints
    }
  })

  return result
}
