import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Field';
import {
  useMaintenance,
  useApproveMaintenance,
  useRejectMaintenance,
  useAssignMaintenance,
  useStartMaintenance,
  useResolveMaintenance,
} from '../api/hooks';
import { fmtDate } from '../lib/format';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';
import { MaintenanceModal } from '../components/domain/MaintenanceModal';
import type { MaintenanceRequest, MaintenanceStatus } from '../types';

const STATUSES: MaintenanceStatus[] = ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export function Maintenance() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<MaintenanceStatus>('PENDING');
  const [showRaise, setShowRaise] = useState(params.get('new') === '1');
  const [active, setActive] = useState<MaintenanceRequest | null>(null);
  const can = useCan();
  const { toast } = useToast();

  const { data, isLoading } = useMaintenance({ status, limit: 100 });
  const approve = useApproveMaintenance();
  const reject = useRejectMaintenance();
  const assign = useAssignMaintenance();
  const start = useStartMaintenance();
  const resolve = useResolveMaintenance();

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Route repairs through approval before work starts."
        actions={<Button variant="primary" leftIcon="wrench" onClick={() => setShowRaise(true)}>Raise Request</Button>}
      />
      <Tabs value={status} onChange={setStatus} items={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {!isLoading && (data?.data ?? []).length === 0 && <EmptyState icon="wrench" title="No requests here" />}
        {(data?.data ?? []).map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setActive(m)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{m.asset?.name} · raised by {m.raisedBy?.name} · {fmtDate(m.createdAt)}</div>
            </div>
            <Badge status={m.priority} />
            <Badge status={m.status} />
          </div>
        ))}
      </div>

      {showRaise && <MaintenanceModal onClose={() => { setShowRaise(false); setParams({}); }} />}

      {active && (
        <Modal open onClose={() => setActive(null)} title={active.title} width={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{active.description || 'No description provided.'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge status={active.priority} />
              <Badge status={active.status} />
            </div>
            {active.status === 'PENDING' && can.approve && (
              <ActionButtons
                onApprove={() => void approve.mutateAsync(active.id).then(() => { toast('success', 'Approved. Asset moved to Under Maintenance.'); setActive(null); }).catch((e) => toast('error', apiError(e).message))}
                onReject={(reason) => void reject.mutateAsync({ id: active.id, reason }).then(() => { toast('success', 'Request rejected.'); setActive(null); })}
              />
            )}
            {active.status === 'APPROVED' && can.approve && (
              <AssignForm onSubmit={(tech) => void assign.mutateAsync({ id: active.id, technicianName: tech }).then(() => { toast('success', 'Technician assigned.'); setActive(null); })} />
            )}
            {active.status === 'ASSIGNED' && can.approve && (
              <Button variant="primary" onClick={() => void start.mutateAsync(active.id).then(() => { toast('success', 'Work started.'); setActive(null); })}>Start Work</Button>
            )}
            {active.status === 'IN_PROGRESS' && can.approve && (
              <ResolveForm onSubmit={(notes, cost) => void resolve.mutateAsync({ id: active.id, body: { resolutionNotes: notes, cost } }).then(() => { toast('success', 'Resolved. Asset returned to service.'); setActive(null); })} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActionButtons({ onApprove, onReject }: { onApprove: () => void; onReject: (reason: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  if (rejecting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Textarea label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="danger" onClick={() => onReject(reason)}>Confirm Reject</Button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="primary" onClick={onApprove}>Approve</Button>
      <Button variant="outline" onClick={() => setRejecting(true)}>Reject</Button>
    </div>
  );
}

function AssignForm({ onSubmit }: { onSubmit: (tech: string) => void }) {
  const [tech, setTech] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Input label="Technician name" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Ravi Kumar" />
      <Button variant="primary" onClick={() => onSubmit(tech)} disabled={!tech.trim()}>Assign Technician</Button>
    </div>
  );
}

function ResolveForm({ onSubmit }: { onSubmit: (notes: string, cost?: number) => void }) {
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Textarea label="Resolution notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Input label="Cost (₹, optional)" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
      <Button variant="primary" onClick={() => onSubmit(notes, cost ? Number(cost) : undefined)} disabled={notes.trim().length < 3}>Mark Resolved</Button>
    </div>
  );
}
