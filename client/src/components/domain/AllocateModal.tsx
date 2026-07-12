import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { useCreateAllocation } from '../../api/hooks';
import { useUsers, useDepartments } from '../../api/hooks';
import { useToast } from '../../app/toast';
import { apiError } from '../../api/client';
import { fmtDate } from '../../lib/format';
import { Icon } from '../../lib/icons';
import type { Asset } from '../../types';

export function AllocateModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [holderType, setHolderType] = useState<'USER' | 'DEPARTMENT'>('USER');
  const [holderId, setHolderId] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');
  const [notes, setNotes] = useState('');
  const [conflict, setConflict] = useState<{ holderName: string; holderType: string; since: string } | null>(null);
  const [error, setError] = useState('');
  const { data: users } = useUsers({ limit: 200 });
  const { data: departments } = useDepartments();
  const createAllocation = useCreateAllocation();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    setConflict(null);
    if (!holderId) return setError('Select a holder.');
    try {
      await createAllocation.mutateAsync({
        assetId: asset.id,
        ...(holderType === 'USER' ? { holderUserId: holderId } : { holderDepartmentId: holderId }),
        expectedReturnAt: expectedReturnAt || undefined,
        notes: notes || undefined,
      });
      toast('success', `${asset.name} allocated successfully.`);
      onClose();
    } catch (err) {
      const e = apiError(err);
      if (e.errorCode === 'ALLOCATION_CONFLICT' && e.conflict) {
        setConflict(e.conflict);
      } else {
        setError(e.message);
      }
    }
  };

  return (
    <Modal open onClose={onClose} title="Allocate Asset">
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}

      {conflict && (
        <div style={{ background: '#fffbeb', border: '1px solid rgba(217,119,6,.25)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="alert" size={15} color="#d97706" />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#b45309' }}>Already allocated</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
            Currently held by <b>{conflict.holderName}</b> since {fmtDate(conflict.since)}.
          </p>
          <Button variant="primary" size="sm" onClick={onClose}>Request Transfer Instead</Button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setHolderType('USER'); setHolderId(''); }}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: holderType === 'USER' ? '1px solid #4f46e5' : '1px solid var(--border)', background: holderType === 'USER' ? '#eef2ff' : 'transparent', color: holderType === 'USER' ? '#4338ca' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Employee
          </button>
          <button
            onClick={() => { setHolderType('DEPARTMENT'); setHolderId(''); }}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: holderType === 'DEPARTMENT' ? '1px solid #4f46e5' : '1px solid var(--border)', background: holderType === 'DEPARTMENT' ? '#eef2ff' : 'transparent', color: holderType === 'DEPARTMENT' ? '#4338ca' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Department
          </button>
        </div>
        <Select label="Holder" value={holderId} onChange={(e) => setHolderId(e.target.value)}>
          <option value="">Select…</option>
          {holderType === 'USER'
            ? (users?.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)
            : (departments?.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Input label="Expected return date (optional)" type="date" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="primary" isLoading={createAllocation.isPending} onClick={() => void submit()}>Allocate</Button>
      </div>
    </Modal>
  );
}
