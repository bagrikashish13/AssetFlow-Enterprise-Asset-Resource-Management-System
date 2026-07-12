import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Field';
import { useCreateMaintenance, useAssets } from '../../api/hooks';
import { useToast } from '../../app/toast';
import { apiError } from '../../api/client';
import type { MaintenancePriority } from '../../types';

const PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITY_COLOR: Record<MaintenancePriority, string> = { LOW: '#64748b', MEDIUM: '#0284c7', HIGH: '#d97706', CRITICAL: '#e11d48' };

export function MaintenanceModal({ assetId, onClose }: { assetId?: string; onClose: () => void }) {
  const [selectedAssetId, setSelectedAssetId] = useState(assetId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [error, setError] = useState('');
  const { data: assets } = useAssets({ limit: 100 });
  const createMaintenance = useCreateMaintenance();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    if (!selectedAssetId) return setError('Select an asset.');
    if (title.trim().length < 3) return setError('Enter a short title.');
    try {
      await createMaintenance.mutateAsync({ assetId: selectedAssetId, title, description: description || undefined, priority });
      toast('success', 'Maintenance request submitted.');
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Raise Maintenance Request">
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!assetId && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>Asset</label>
            <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13.5, background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="">Select asset…</option>
              {(assets?.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
              ))}
            </select>
          </div>
        )}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Screen flickering intermittently" />
        <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>Priority</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{ flex: 1, padding: '7px 8px', borderRadius: 8, border: priority === p ? `1px solid ${PRIORITY_COLOR[p]}` : '1px solid var(--border)', background: priority === p ? `${PRIORITY_COLOR[p]}18` : 'transparent', color: priority === p ? PRIORITY_COLOR[p] : 'var(--text-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" isLoading={createMaintenance.isPending} onClick={() => void submit()}>Submit Request</Button>
      </div>
    </Modal>
  );
}
