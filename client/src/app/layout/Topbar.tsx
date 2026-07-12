import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { Icon } from '../../lib/icons';
import { Avatar } from '../../components/ui/Avatar';
import { notificationsApi } from '../../api/endpoints';
import { fmtAgo } from '../../lib/format';
import { notifIcon } from '../../lib/icons';
import { statusColor } from '../../lib/status';

export function Topbar({ crumb, onOpenPalette }: { crumb: string; onOpenPalette: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => notificationsApi.list({ limit: 6 }),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = data?.meta.unreadCount ?? 0;
  const items = data?.data ?? [];

  const markAll = async () => {
    await notificationsApi.readAll();
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  if (!user) return null;

  return (
    <div
      style={{
        height: 64,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-3)' }}>
        <span>AssetFlow</span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{crumb}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onOpenPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 12px',
            cursor: 'pointer',
            color: 'var(--text-3)',
            fontSize: 13,
            width: 220,
          }}
        >
          <Icon name="search" size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <span style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px', color: 'var(--text-2)', fontWeight: 600 }}>⌘K</span>
        </button>
        <button onClick={toggle} title="Toggle theme" style={{ background: 'none', border: '1px solid transparent', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            style={{ position: 'relative', background: 'none', border: '1px solid transparent', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
          >
            <Icon name="bell" size={19} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 3, right: 3, background: '#e11d48', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 20px 40px rgba(15,23,42,.15)', zIndex: 60, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                <button onClick={() => void markAll()} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>You're all caught up</div>}
                {items.map((n) => {
                  const c = statusColor(n.isRead ? 'INACTIVE' : 'ACTIVE');
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setBellOpen(false);
                        void notificationsApi.read(n.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
                      }}
                      style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', border: 'none', padding: '12px 16px', cursor: 'pointer', background: n.isRead ? 'transparent' : 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
                    >
                      <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 8, background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={notifIcon(n.type)} size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{fmtAgo(n.createdAt)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setBellOpen(false);
                  navigate('/notifications');
                }}
                style={{ width: '100%', background: 'var(--surface-2)', border: 'none', borderTop: '1px solid var(--line)', padding: 10, fontSize: 12.5, fontWeight: 600, color: '#4f46e5', cursor: 'pointer' }}
              >
                View all
              </button>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAvatarOpen((o) => !o)} style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}>
            <Avatar name={user.name} size={34} />
          </button>
          {avatarOpen && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 20px 40px rgba(15,23,42,.15)', zIndex: 60, padding: 6 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{user.email}</div>
              </div>
              <button
                onClick={() => void logout().then(() => navigate('/login'))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, color: '#be123c', cursor: 'pointer' }}
              >
                <Icon name="logout" size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
