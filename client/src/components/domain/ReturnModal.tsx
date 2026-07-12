import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select, Textarea } from '../ui/Field';
import { useReturnAllocation } from '../../api/hooks';
import { useToast } from '../../app/toast';
import { apiError } from '../../api/client';
import type { AssetCondition } from '../../types';

export function ReturnModal({ allocationId, onClose }: { allocationId: string; onClose: () => void }) {
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [error, setError] = useState('');
  const returnAllocation = useReturnAllocation();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    try {
      await returnAllocation.mutateAsync({ id: allocationId, body: { returnCondition, returnNotes: returnNotes || undefined } });
      toast('success', 'Asset returned. Status reverts to Available.');
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Return Asset">
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Condition on return" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}>
          {['NEW', 'GOOD', 'FAIR', 'POOR'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Textarea label="Check-in notes (optional)" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
        <Button variant="primary" isLoading={returnAllocation.isPending} onClick={() => void submit()}>Confirm Return</Button>
      </div>
    </Modal>
  );
}
