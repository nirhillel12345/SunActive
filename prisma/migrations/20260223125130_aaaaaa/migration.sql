/*
  Warnings:

  - The values [MINT,REFUND] on the enum `LedgerType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `Ledger` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `Ledger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetUserId` to the `Ledger` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LedgerType_new" AS ENUM ('ADMIN_MINT_TO_AGENT', 'ADMIN_MINT_TO_USER', 'AGENT_MINT_TO_USER', 'AGENT_DEDUCT_FROM_USER', 'BET_PLACE', 'BET_WIN', 'BET_LOSS');
ALTER TABLE "Ledger" ALTER COLUMN "type" TYPE "LedgerType_new" USING ("type"::text::"LedgerType_new");
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
ALTER TYPE "LedgerType_new" RENAME TO "LedgerType";
DROP TYPE "LedgerType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'AGENT';

-- DropForeignKey
ALTER TABLE "Ledger" DROP CONSTRAINT "Ledger_userId_fkey";

-- DropIndex
DROP INDEX "Ledger_userId_idx";

-- AlterTable
ALTER TABLE "Ledger" DROP COLUMN "userId",
ADD COLUMN     "actorId" TEXT NOT NULL,
ADD COLUMN     "targetUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agentId" TEXT;

-- CreateIndex
CREATE INDEX "Ledger_actorId_idx" ON "Ledger"("actorId");

-- CreateIndex
CREATE INDEX "Ledger_targetUserId_idx" ON "Ledger"("targetUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
