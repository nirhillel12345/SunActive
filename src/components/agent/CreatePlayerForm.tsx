"use client"

import { useState } from 'react'
import bcrypt from 'bcryptjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

type Player = { id: string; username: string; email: string; balancePoints: number }

export default function CreatePlayerForm({ onCreated, onCancel }: { onCreated: (user: Player, updatedAgentBalance?: number) => void; onCancel?: () => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [initialPoints, setInitialPoints] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function submit() {
    if (!username || !email || !password) return toast.push({ title: 'Missing fields', description: 'Username, email and password required', type: 'error' })
    if (!Number.isInteger(initialPoints) || initialPoints < 0) return toast.push({ title: 'Invalid points', description: 'Initial points must be 0 or a positive integer', type: 'error' })

    setLoading(true)
    try {
      const passwordHash = await bcrypt.hash(password, 10)
      const res = await fetch('/api/agent/create-player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, passwordHash }) })
      const data = await res.json()
      if (!data.success) {
        toast.push({ title: 'Create failed', description: data.error || 'unknown', type: 'error' })
        return
      }

      const user = data.user as Player

      // if initialPoints > 0, mint from agent to player
      if (initialPoints > 0) {
        const res2 = await fetch('/api/agent/mint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, amount: initialPoints }) })
        const d2 = await res2.json()
        if (!d2.success) {
          toast.push({ title: 'Create succeeded', description: `Player created but mint failed: ${d2.error || 'unknown'}`, type: 'error' })
          onCreated(user)
          return
        }
        const { agentBalance, playerBalance } = d2.data
        user.balancePoints = playerBalance
        onCreated(user, agentBalance)
        toast.push({ title: 'Player created & funded', description: `${initialPoints} pts minted`, type: 'success' })
      } else {
        onCreated(user)
        toast.push({ title: 'Player created', description: `${user.username} created`, type: 'success' })
      }
    } catch (e: any) {
      toast.push({ title: 'Error', description: e?.message || 'unknown', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="space-y-2">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Initial points (optional)" type="number" value={initialPoints} onChange={(e) => setInitialPoints(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 mt-3">
  <Button variant="secondary" onClick={() => onCancel?.()} >Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
      </div>
    </div>
  )
}
