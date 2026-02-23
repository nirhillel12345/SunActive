"use client"

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

type Agent = { id: string; username: string; email: string; balancePoints: number; createdAt: string }

export default function CreateAgentForm({ onCreated, onCancel }: { onCreated: (agent: Agent) => void; onCancel?: () => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [initialBalance, setInitialBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function submit() {
    if (!username || !email || !password) return toast.push({ title: 'Missing fields', description: 'username, email and password are required', type: 'error' })
    if (!Number.isInteger(initialBalance) || initialBalance < 0) return toast.push({ title: 'Invalid balance', description: 'Initial balance must be 0 or positive integer', type: 'error' })

    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, initialBalance }) })
      const d = await res.json()
      if (!d.success) return toast.push({ title: 'Create failed', description: d.error || 'unknown', type: 'error' })
      const user = d.user as Agent
      onCreated(user)
    } catch (e: any) {
      toast.push({ title: 'Network error', description: e?.message || 'unknown', type: 'error' })
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
        <Input label="Initial balance" type="number" value={initialBalance} onChange={(e) => setInitialBalance(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 mt-3">
  <Button variant="secondary" onClick={() => onCancel?.()}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create Agent'}</Button>
      </div>
    </div>
  )
}
