import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/server/auth';
export async function getSession() {
    return await getServerSession(authOptions);
}
export default getSession;
