import AdminMarketsClient from '@/components/AdminMarketsClient';
import { prisma } from '@/server/db/prisma';
export default async function Page() {
    const count = await prisma.market.count();
    const last = await prisma.market.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } });
    const rows = await prisma.market.findMany({ orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, question: true, category: true, resolved: true, liquidity: true, volume: true, updatedAt: true } });
    return (<div>
      <h1 className="text-2xl font-bold mb-4">Admin Markets</h1>
      <AdminMarketsClient initialCount={count} initialUpdatedAt={last?.updatedAt?.toISOString() ?? null} initialRows={rows}/>
    </div>);
}
