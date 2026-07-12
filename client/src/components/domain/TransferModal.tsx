import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select, Textarea } from '../ui/Field';
import { useCreateTransfer, useUsers, useDepartments } from '../../api/hooks';
import { useToast } from '../../app/toast';
import { apiError } from '../../api/client';
import type { Asset } from '../../types';

export function TransferModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [targetType, setTargetType] = useState<'USER' | 'DEPARTMENT'>('USER');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const { data: users } = useUsers({ limit: 200 });
  const { data: departments } = useDepartments();
  const createTransfer = useCreateTransfer();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    if (!targetId) return setError('Select a target.');
    if (reason.trim().length < 3) return setError('Enter a reason.');
    try {
      await createTransfer.mutateAsync({
        assetId: asset.id,
        ...(targetType === 'USER' ? { targetUserId: targetId } : { targetDepartmentId: targetId }),
        reason,
      });
      toast('success', 'Transfer request submitted.');
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Request Transfer">
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setTargetType('USER'); setTargetId(''); }} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: targetType === 'USER' ? '1px solid #4f46e5' : '1px solid var(--border)', background: targetType === 'USER' ? '#eef2ff' : 'transparent', color: targetType === 'USER' ? '#4338ca' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Employee</button>
          <button onClick={() => { setTargetType('DEPARTMENT'); setTargetId(''); }} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: targetType === 'DEPARTMENT' ? '1px solid #4f46e5' : '1px solid var(--border)', background: targetType === 'DEPARTMENT' ? '#eef2ff' : 'transparent', color: targetType === 'DEPARTMENT' ? '#4338ca' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Department</button>
        </div>
        <Select label="Transfer to" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Select…</option>
          {targetType === 'USER'
            ? (users?.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)
            : (departments?.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this transfer needed?" />
        <Button variant="primary" isLoading={createTransfer.isPending} onClick={() => void submit()}>Request Transfer</Button>
      </div>
    </Modal>
  );
}
