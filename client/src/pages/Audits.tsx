import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Field';
import { useAudits, useCreateAudit, useDepartments, useUsers } from '../api/hooks';
import { fmtDate } from '../lib/format';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';

export function Audits() {
  const navigate = useNavigate();
  const can = useCan();
  const { data, isLoading } = useAudits({ limit: 100 });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <PageHeader
        title="Audits"
        description="Run structured verification cycles and track discrepancies."
        actions={can.isAdmin && <Button variant="primary" leftIcon="plus" onClick={() => setShowCreate(true)}>Create Audit Cycle</Button>}
      />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {!isLoading && (data?.data ?? []).length === 0 && <EmptyState icon="clip" title="No audit cycles yet" />}
        {(data?.data ?? []).map((a) => (
          <div key={a.id} onClick={() => navigate(`/audits/${a.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>
                {a.department?.name ?? 'Org-wide'} · {fmtDate(a.startDate)} – {fmtDate(a.endDate)} · {a.progress.checked}/{a.progress.total} checked
              </div>
            </div>
            {a.progress.missing + a.progress.damaged > 0 && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#be123c', background: '#fff1f2', borderRadius: 999, padding: '2px 8px' }}>{a.progress.missing + a.progress.damaged} flagged</span>
            )}
            <Badge status={a.status} />
          </div>
        ))}
      </div>
      {showCreate && <CreateAuditModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateAuditModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [auditorIds, setAuditorIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { data: departments } = useDepartments();
  const { data: users } = useUsers({ limit: 100 });
  const createAudit = useCreateAudit();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    if (!name.trim() || !startDate || !endDate || auditorIds.length === 0) return setError('Fill in all fields and pick at least one auditor.');
    try {
      await createAudit.mutateAsync({ name, departmentId: departmentId || undefined, startDate, endDate, auditorIds });
      toast('success', 'Audit cycle created.');
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Create Audit Cycle">
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 IT Audit" />
        <Select label="Department (optional)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Org-wide</option>
          {(departments?.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div style={{ flex: 1 }}><Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>Auditors</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(users?.data ?? []).map((u) => {
              const selected = auditorIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setAuditorIds((ids) => (selected ? ids.filter((i) => i !== u.id) : [...ids, u.id]))}
                  style={{ border: selected ? '1px solid #4f46e5' : '1px solid var(--border)', background: selected ? '#eef2ff' : 'transparent', color: selected ? '#4338ca' : 'var(--text-2)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="primary" isLoading={createAudit.isPending} onClick={() => void submit()}>Create Cycle</Button>
      </div>
    </Modal>
  );
}
