"use client"

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'
import CreateAgentForm from './CreateAgentForm'

type Agent = { id: string; username: string; email: string; balancePoints: number; createdAt: string }

function formatDateIso(dateStr: string) {
  try {
    return new Date(dateStr).toISOString().replace('T', ' ').replace('Z', ' UTC')
  } catch (e) {
    return dateStr
  }
}

export default function AdminAgentsClient({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const toast = useToast()

  async function handleCreated(agent: Agent) {
    setAgents((s) => [agent, ...s])
    setCreating(false)
    toast.push({ title: 'Agent created', description: `${agent.username} (${agent.email})`, type: 'success' })
  }

  async function startEdit(a: Agent) {
    setEditingId(a.id)
    setEditValue(a.balancePoints)
  }

  async function submitEdit() {
    if (!editingId) return
    if (!Number.isInteger(editValue) || editValue < 0) return toast.push({ title: 'Invalid value', description: 'Balance must be 0 or positive integer', type: 'error' })
    setLoadingEdit(true)
    try {
      const res = await fetch('/api/admin/agents/update-balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: editingId, balancePoints: editValue }) })
      const d = await res.json()
      if (!d.success) return toast.push({ title: 'Update failed', description: d.error || 'unknown', type: 'error' })
      const updated = d.agent as Agent
      setAgents((prev) => prev.map((p) => p.id === updated.id ? { ...p, balancePoints: updated.balancePoints } : p))
      setEditingId(null)
      toast.push({ title: 'Updated', description: `Balance updated to ${updated.balancePoints}`, type: 'success' })
    } catch (e: any) {
      toast.push({ title: 'Network error', description: e?.message || 'unknown', type: 'error' })
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div />
        <div>
          <Button variant="primary" onClick={() => setCreating(true)}>Create Agent</Button>
        </div>
      </div>

      <Card className="overflow-x-auto mb-4">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Balance</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.username}</td>
                <td className="p-2">{a.email}</td>
                <td className="p-2">
                  {editingId === a.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={editValue} onChange={(e) => setEditValue(Number(e.target.value))} />
                      <Button variant="primary" onClick={submitEdit} disabled={loadingEdit}>{loadingEdit ? 'Saving…' : 'Save'}</Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.balancePoints}</span>
                      <Button variant="secondary" onClick={() => startEdit(a)}>Edit</Button>
                    </div>
                  )}
                </td>
                <td className="p-2">{formatDateIso(a.createdAt)}</td>
                <td className="p-2">
                  {/* possible future actions */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <h3 className="text-lg font-semibold mb-2">Create Agent</h3>
        <CreateAgentForm onCreated={handleCreated} />
      </Modal>
    </div>
  )
}
