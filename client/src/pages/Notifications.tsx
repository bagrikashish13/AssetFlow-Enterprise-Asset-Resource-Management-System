import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon, notifIcon } from '../lib/icons';
import { fmtAgo } from '../lib/format';
import { notificationsApi } from '../api/endpoints';
import { statusColor } from '../lib/status';

export function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications', 'all'], queryFn: () => notificationsApi.list({ limit: 100 }) });

  const markAll = async () => {
    await notificationsApi.readAll();
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title="Notifications"
        description="Stay on top of what needs your attention."
        actions={<Button variant="outline" onClick={() => void markAll()}>Mark all read</Button>}
      />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {!isLoading && (data?.data ?? []).length === 0 && <EmptyState icon="bell" title="You're all caught up" />}
        {(data?.data ?? []).map((n) => {
          const c = statusColor(n.isRead ? 'INACTIVE' : 'ACTIVE');
          return (
            <button
              key={n.id}
              onClick={() => {
                void notificationsApi.read(n.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
                if (n.entityType === 'asset' && n.entityId) navigate(`/assets/${n.entityId}`);
                else if (n.entityType === 'audit' && n.entityId) navigate(`/audits/${n.entityId}`);
              }}
              style={{ display: 'flex', gap: 14, width: '100%', textAlign: 'left', border: 'none', padding: '14px 18px', cursor: 'pointer', background: n.isRead ? 'transparent' : 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: 9, background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={notifIcon(n.type)} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</span>
                  {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: 99, background: '#4f46e5' }} />}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5 }}>{fmtAgo(n.createdAt)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
