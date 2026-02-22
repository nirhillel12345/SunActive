"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const next_auth_1 = __importDefault(require("next-auth"));
const prisma_1 = require("@/server/db/prisma");
const authService_1 = require("@/server/services/authService");
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password)
                    return null;
                const user = await prisma_1.prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user)
                    return null;
                const valid = await (0, authService_1.verifyPassword)(credentials.password, user.passwordHash);
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
exports.default = (0, next_auth_1.default)(exports.authOptions);
