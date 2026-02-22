# SunActive

Production-style fullstack scaffold (Next.js 14 App Router + TypeScript + Tailwind + Prisma + Postgres + Redis + NextAuth)

This repository is a scaffold. It includes:

- Next.js 14 (App Router) + TypeScript
- TailwindCSS
- Prisma ORM with a `User` model
- PostgreSQL and Redis via `docker compose`
- NextAuth (Credentials provider)
- Zod available as a validation library

Quick start (macOS / bash)

1. Copy example env and start local DB services:

```bash
cp .env.example .env
docker compose up -d
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and run migrations (creates initial schema):

```bash
npm run prisma:generate
npm run prisma:migrate
# seed admin + user
npm run prisma:seed
```

4. Start development server:

```bash
npm run dev
```

5. Open http://localhost:3000

Notes

- You must edit `.env` and set `NEXTAUTH_SECRET` to a secure random string in production.
- The scaffold includes a Credentials provider for NextAuth. Create users using the `createUser`
  helper in `src/services/authService.ts` or by running a small script that calls Prisma.

Files created by the scaffold (high-level)

- `package.json`, `tsconfig.json`, `next.config.js`
- `prisma/schema.prisma` (User model)
- `docker-compose.yml` (postgres + redis)
- `src/` app router + auth + db helpers

If you want me to create an initial admin user script or seed data, tell me the email and password
to create (or ask to scaffold an env-based seed).

# SunActive
