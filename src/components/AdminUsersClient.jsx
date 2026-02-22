"use client";
import { useState } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Card from './ui/Card';
import { useToast } from './ui/ToastProvider';
export default function AdminUsersClient({ initialUsers }) {
    const [users, setUsers] = useState(initialUsers);
    const [mintingUserId, setMintingUserId] = useState(null);
    const [amount, setAmount] = useState(0);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    function openModal(userId) {
        setMintingUserId(userId);
        setAmount(0);
        setNote('');
    }
    function closeModal() {
        setMintingUserId(null);
    }
    async function submitMint() {
        if (!mintingUserId)
            return;
        if (!Number.isFinite(amount) || amount <= 0)
            return toast.push({ title: 'Invalid amount', description: 'Amount must be > 0', type: 'error' });
        setLoading(true);
        try {
            const res = await fetch('/api/admin/mint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: mintingUserId, amount, note }) });
            const data = await res.json();
            if (data.success) {
                setUsers((prev) => prev.map((u) => u.id === mintingUserId ? { ...u, balancePoints: data.balance } : u));
                toast.push({ title: 'Mint successful', description: `Added ${amount} points`, type: 'success' });
                closeModal();
            }
            else {
                toast.push({ title: 'Mint failed', description: data.error || 'unknown', type: 'error' });
            }
        }
        catch (e) {
            toast.push({ title: 'Network error', type: 'error' });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div>
      <Card className="overflow-x-auto mb-4">
        {/* Desktop/tablet: show table; Mobile: show stacked cards */}
        <table className="w-full table-auto border-collapse hidden sm:table">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Balance</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (<tr key={u.id} className="border-b">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.balancePoints}</td>
                <td className="p-2">
                  <Button variant="primary" onClick={() => openModal(u.id)}>Mint Points</Button>
                </td>
              </tr>))}
          </tbody>
        </table>

        <div className="space-y-3 sm:hidden">
          {users.map((u) => (<div key={u.id} className="p-3 border rounded flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.username}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
                <div className="text-xs text-gray-500 mt-1">{u.role} • {u.balancePoints} pts</div>
              </div>
              <div className="ml-3">
                <Button variant="primary" onClick={() => openModal(u.id)}>Mint</Button>
              </div>
            </div>))}
        </div>
      </Card>

      <Modal open={!!mintingUserId} onClose={closeModal}>
        <h3 className="text-lg font-semibold mb-2">Mint points</h3>
        <div className="mb-2">
          <Input label="Amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}/>
        </div>
        <div className="mb-4">
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}/>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={submitMint} className="px-4" disabled={loading}>{loading ? 'Minting…' : 'Mint'}</Button>
        </div>
      </Modal>
    </div>);
}
