import CredentialsProvider from 'next-auth/providers/credentials';
import NextAuth from 'next-auth';
import { prisma } from '@/server/db/prisma';
import { verifyPassword } from '@/server/services/authService';
export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password)
                    return null;
                const user = await prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user)
                    return null;
                const valid = await verifyPassword(credentials.password, user.passwordHash);
                if (!valid)
                    return null;
                // return user object with role for JWT
                return { id: user.id, username: user.username, name: user.username, email: user.email, role: user.role };
            }
        })
    ],
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/signin'
    },
    callbacks: {
        async jwt({ token, user }) {
            // first time jwt callback is run, user object is available
            if (user) {
                token.userId = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                ;
                session.user.id = token.userId;
                session.user.role = token.role;
            }
            return session;
        }
    }
};
export default NextAuth(authOptions);
