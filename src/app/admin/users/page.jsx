import AdminUsersClient from '../../../components/AdminUsersClient';
import { prisma } from '@/server/db/prisma';
export default async function Page() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, username: true, email: true, role: true, balancePoints: true, createdAt: true } });
    // stringify dates for client
    const rows = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
    return (<div>
      <h1 className="text-2xl font-bold mb-4">Admin — Users</h1>
      <AdminUsersClient initialUsers={rows}/>
    </div>);
}
