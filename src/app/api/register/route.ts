import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createUser } from '@/server/services/authService'

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8)
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const user = await createUser(data.username, data.email, data.password)
    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, email: user.email } })
  } catch (err: any) {
    const msg = err?.message || 'Registration failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
