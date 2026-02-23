"use client"

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

type Player = { id: string; username: string; email: string; balancePoints: number }

export default function PlayerRowActions({ player, onPlayerUpdated, onAgentUpdated, agentBalance }: { player: Player; agentBalance: number; onPlayerUpdated: (id: string, newBalance: number) => void; onAgentUpdated: (newBalance: number) => void }) {
  const [openMint, setOpenMint] = useState(false)
  const [openDeduct, setOpenDeduct] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function submitMint() {
    if (!Number.isInteger(amount) || amount <= 0) return toast.push({ title: 'Invalid amount', description: 'Amount must be > 0', type: 'error' })
    if (amount > agentBalance) return toast.push({ title: 'Insufficient funds', description: 'Cannot mint more than your balance', type: 'error' })
    setLoading(true)
    try {
      const res = await fetch('/api/agent/mint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: player.id, amount }) })
      const d = await res.json()
      if (!d.success) return toast.push({ title: 'Mint failed', description: d.error || 'unknown', type: 'error' })
      const { agentBalance: ab, playerBalance: pb } = d.data
      onAgentUpdated(ab)
      onPlayerUpdated(player.id, pb)
      toast.push({ title: 'Mint successful', description: `Added ${amount} pts to ${player.username}`, type: 'success' })
      setOpenMint(false)
    } catch (e: any) {
      toast.push({ title: 'Network error', description: e?.message || 'unknown', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function submitDeduct() {
    if (!Number.isInteger(amount) || amount <= 0) return toast.push({ title: 'Invalid amount', description: 'Amount must be > 0', type: 'error' })
    setLoading(true)
    try {
      const res = await fetch('/api/agent/deduct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: player.id, amount }) })
      const d = await res.json()
      if (!d.success) return toast.push({ title: 'Deduct failed', description: d.error || 'unknown', type: 'error' })
      const { agentBalance: ab, playerBalance: pb } = d.data
      onAgentUpdated(ab)
      onPlayerUpdated(player.id, pb)
      toast.push({ title: 'Deduct successful', description: `Deducted ${amount} pts from ${player.username}`, type: 'success' })
      setOpenDeduct(false)
    } catch (e: any) {
      toast.push({ title: 'Network error', description: e?.message || 'unknown', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => { setAmount(0); setOpenMint(true) }}>Mint</Button>
      <Button variant="secondary" onClick={() => { setAmount(0); setOpenDeduct(true) }}>Deduct</Button>

      <Modal open={openMint} onClose={() => setOpenMint(false)}>
        <h3 className="text-lg font-semibold mb-2">Mint to {player.username}</h3>
        <div className="mb-2">
          <Input label="Amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpenMint(false)}>Cancel</Button>
          <Button variant="primary" onClick={submitMint} disabled={loading}>{loading ? 'Processing…' : 'Mint'}</Button>
        </div>
      </Modal>

      <Modal open={openDeduct} onClose={() => setOpenDeduct(false)}>
        <h3 className="text-lg font-semibold mb-2">Deduct from {player.username}</h3>
        <div className="mb-2">
          <Input label="Amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpenDeduct(false)}>Cancel</Button>
          <Button variant="primary" onClick={submitDeduct} disabled={loading}>{loading ? 'Processing…' : 'Deduct'}</Button>
        </div>
      </Modal>
    </div>
  )
}
