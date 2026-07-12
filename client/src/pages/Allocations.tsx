import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Textarea, Select } from '../components/ui/Field';
import { useAllocations, useTransfers, useApproveTransfer, useRejectTransfer } from '../api/hooks';
import { useReturnAllocation } from '../api/hooks';
import { fmtDate } from '../lib/format';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';
import type { AssetCondition, TransferRequest } from '../types';

type Tab = 'active' | 'overdue' | 'transfers' | 'history';

export function Allocations() {
  const [tab, setTab] = useState<Tab>('active');
  const navigate = useNavigate();
  const can = useCan();

  const activeQ = useAllocations({ status: 'ACTIVE', limit: 100 });
  const historyQ = useAllocations({ status: 'RETURNED', limit: 100 });
  const transfersQ = useTransfers({ limit: 100 });
  const approveTransfer = useApproveTransfer();
  const rejectingId = useRejectingState();
  const rejectTransfer = useRejectTransfer();
  const returnAllocation = useReturnAllocation();
  const { toast } = useToast();
  const [returnFor, setReturnFor] = useState<string | null>(null);

  const now = Date.now();
  const overdueRows = (activeQ.data?.data ?? []).filter((a) => a.expectedReturnAt && new Date(a.expectedReturnAt).getTime() < now);
  const pendingTransfers = (transfersQ.data?.data ?? []).filter((t) => t.status === 'PENDING');

  return (
    <div>
      <PageHeader title="Allocations & Transfers" description="Track who holds what and manage transfer requests." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'active', label: 'Active', count: activeQ.data?.meta.total },
          { value: 'overdue', label: 'Overdue', count: overdueRows.length },
          { value: 'transfers', label: 'Transfer Requests', count: pendingTransfers.length },
          { value: 'history', label: 'History', count: historyQ.data?.meta.total },
        ]}
      />

      {(tab === 'active' || tab === 'overdue') && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {(tab === 'active' ? activeQ.data?.data ?? [] : overdueRows).length === 0 ? (
            <EmptyState icon="swap" title={tab === 'overdue' ? 'Nothing overdue' : 'No active allocations'} />
          ) : (
            (tab === 'active' ? activeQ.data?.data ?? [] : overdueRows).map((a) => {
              const overdue = a.expectedReturnAt && new Date(a.expectedReturnAt).getTime() < now;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)', background: overdue ? '#fff1f210' : undefined }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => navigate(`/assets/${a.assetId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{a.asset?.name}</button>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{a.holderUser?.name ?? a.holderDepartment?.name} · allocated {fmtDate(a.allocatedAt)}</div>
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{a.expectedReturnAt ? `Due ${fmtDate(a.expectedReturnAt)}` : 'No due date'}</span>
                  {overdue && <Badge status="LOST" label="Overdue" />}
                  {can.manageAssets && (
                    <Button size="sm" variant="outline" onClick={() => setReturnFor(a.id)}>Return</Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(transfersQ.data?.data ?? []).length === 0 && <EmptyState icon="swap" title="No transfer requests" />}
          {(transfersQ.data?.data ?? []).map((t: TransferRequest) => (
            <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.asset?.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                    Requested by {t.requestedBy?.name} → {t.targetUser?.name ?? t.targetDepartment?.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>Reason: {t.reason}</div>
                </div>
                <Badge status={t.status} />
              </div>
              {t.status === 'PENDING' && can.approve && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={approveTransfer.isPending}
                    onClick={() => void approveTransfer.mutateAsync(t.id).then(() => toast('success', 'Transfer approved.')).catch((e) => toast('error', apiError(e).message))}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectingId.open(t.id)}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {(historyQ.data?.data ?? []).length === 0 ? (
            <EmptyState icon="swap" title="No return history" />
          ) : (
            (historyQ.data?.data ?? []).map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.asset?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{a.holderUser?.name ?? a.holderDepartment?.name}</div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Returned {fmtDate(a.returnedAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {returnFor && (
        <ReturnAllocModal
          id={returnFor}
          onClose={() => setReturnFor(null)}
          onSubmit={async (body) => {
            await returnAllocation.mutateAsync({ id: returnFor, body });
            toast('success', 'Asset returned.');
            setReturnFor(null);
          }}
        />
      )}

      {rejectingId.id && (
        <RejectTransferModal
          onClose={rejectingId.close}
          onSubmit={async (note) => {
            await rejectTransfer.mutateAsync({ id: rejectingId.id!, note });
            toast('success', 'Transfer rejected.');
            rejectingId.close();
          }}
        />
      )}
    </div>
  );
}

function useRejectingState() {
  const [id, setId] = useState<string | null>(null);
  return { id, open: setId, close: () => setId(null) };
}

function ReturnAllocModal({ onClose, onSubmit }: { id: string; onClose: () => void; onSubmit: (body: { returnCondition: AssetCondition; returnNotes?: string }) => Promise<void> }) {
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [notes, setNotes] = useState('');
  return (
    <Modal open onClose={onClose} title="Return Asset">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Condition" value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
          {['NEW', 'GOOD', 'FAIR', 'POOR'].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="primary" onClick={() => void onSubmit({ returnCondition: condition, returnNotes: notes || undefined })}>Confirm Return</Button>
      </div>
    </Modal>
  );
}

function RejectTransferModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={onClose} title="Reject Transfer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Textarea label="Reason" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain why this transfer is rejected" />
        <Button variant="danger" onClick={() => void onSubmit(note)}>Reject Transfer</Button>
      </div>
    </Modal>
  );
}
