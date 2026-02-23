"use client"

import { useState } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'
import { useToast } from './ui/ToastProvider'
import CreatePlayerForm from './agent/CreatePlayerForm'
import PlayerRowActions from './agent/PlayerRowActions'

type Agent = { id: string; username: string; email: string; balancePoints: number }
type Player = { id: string; username: string; email: string; balancePoints: number }
type Ledger = { id: string; actorId: string; targetUserId: string; type: string; deltaPoints: number; createdAt: string }

export default function AgentDashboardClient({ initialAgent, initialPlayers, initialLedgers }: { initialAgent: Agent; initialPlayers: Player[]; initialLedgers: Ledger[] }) {
  const [agent, setAgent] = useState<Agent>(initialAgent)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [ledgers, setLedgers] = useState<Ledger[]>(initialLedgers)
  const [creating, setCreating] = useState(false)
  const toast = useToast()

  function onPlayerCreated(newPlayer: Player, initialPoints?: number, updatedAgentBalance?: number) {
    setPlayers((p) => [newPlayer, ...p])
    if (typeof updatedAgentBalance === 'number') setAgent((a) => ({ ...a, balancePoints: updatedAgentBalance }))
    toast.push({ title: 'Player created', description: `${newPlayer.username} created` , type: 'success' })
  }

  function onPlayerUpdated(playerId: string, newBalance: number) {
    setPlayers((prev) => prev.map(p => p.id === playerId ? { ...p, balancePoints: newBalance } : p))
  }

  function onAgentBalanceUpdated(newBalance: number) {
    setAgent((a) => ({ ...a, balancePoints: newBalance }))
  }

  function formatDateIso(dateStr: string) {
    try {
      return new Date(dateStr).toISOString().replace('T', ' ').replace('Z', ' UTC')
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-1">
          <div className="text-sm text-gray-500">Agent</div>
          <div className="text-lg font-semibold">{agent.username}</div>
          <div className="text-sm text-gray-500">{agent.email}</div>
          <div className="text-xs text-gray-500 mt-2">Available Points</div>
          <div className="text-2xl font-semibold">{agent.balancePoints} pts</div>
        </Card>

        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Players</h2>
            <div>
              <Button variant="primary" onClick={() => setCreating(true)}>Create player</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse hidden sm:table">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Username</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Balance</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{u.username}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.balancePoints}</td>
                    <td className="p-2">
                      <PlayerRowActions player={u} onPlayerUpdated={onPlayerUpdated} onAgentUpdated={onAgentBalanceUpdated} agentBalance={agent.balancePoints} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-3 sm:hidden">
              {players.map((u) => (
                <div key={u.id} className="p-3 border rounded flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.username}</div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    <div className="text-xs text-gray-500 mt-1">{u.balancePoints} pts</div>
                  </div>
                  <div className="ml-3">
                    <PlayerRowActions player={u} onPlayerUpdated={onPlayerUpdated} onAgentUpdated={onAgentBalanceUpdated} agentBalance={agent.balancePoints} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Recent activity</h2>
        <div className="space-y-2">
          {ledgers.map((l) => (
            <div key={l.id} className="p-3 border rounded flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">{formatDateIso(l.createdAt)}</div>
                <div className="font-medium">{l.type} — {l.deltaPoints > 0 ? '+' : ''}{l.deltaPoints}</div>
              </div>
              <div className={`text-sm font-semibold ${l.deltaPoints > 0 ? 'text-green-600' : 'text-red-600'}`}>{l.deltaPoints > 0 ? `+${l.deltaPoints}` : l.deltaPoints}</div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <h3 className="text-lg font-semibold mb-2">Create player</h3>
        <CreatePlayerForm onCreated={(u: any, agentBalance?: number) => { onPlayerCreated(u, undefined, agentBalance); setCreating(false) }} />
      </Modal>
    </div>
  )
}
