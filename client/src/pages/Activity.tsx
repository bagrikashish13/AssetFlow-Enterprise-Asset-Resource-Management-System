import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Field';
import { Avatar } from '../components/ui/Avatar';
import { useActivity } from '../api/hooks';
import { fmtDateTime } from '../lib/format';

const ENTITY_LABEL: Record<string, string> = {
  ASSET: 'Asset',
  ALLOCATION: 'Allocation',
  TRANSFER: 'Transfer',
  BOOKING: 'Booking',
  MAINTENANCE: 'Maintenance',
  AUDIT_CYCLE: 'Audit',
  DEPARTMENT: 'Department',
  USER: 'User',
};

export function Activity() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useActivity({ limit: 100 });

  const rows = (data?.data ?? []).filter(
    (a) => !q.trim() || a.summary.toLowerCase().includes(q.toLowerCase()) || a.actor?.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Activity Log" description="Full audit trail of every mutation across the system." />
      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <Input placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {!isLoading && rows.length === 0 && <EmptyState icon="clip" title="No activity recorded" />}
        {rows.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <Avatar name={a.actor?.name ?? 'System'} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5 }}>
                <span style={{ fontWeight: 700 }}>{a.actor?.name ?? 'System'}</span>{' '}
                <span style={{ color: 'var(--text-2)' }}>{a.summary}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>
                {ENTITY_LABEL[a.entityType] ?? a.entityType} · {fmtDateTime(a.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
