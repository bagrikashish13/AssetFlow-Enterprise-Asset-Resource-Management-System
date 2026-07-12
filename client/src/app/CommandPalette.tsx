import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, usersApi } from '../api/endpoints';
import { Icon } from '../lib/icons';

interface Result {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: string;
  go: () => void;
}

const QUICK_ACTIONS = (navigate: (p: string) => void): Result[] => [
  { id: 'qa1', group: 'Actions', label: 'Register Asset', icon: 'plus', go: () => navigate('/assets?new=1') },
  { id: 'qa2', group: 'Actions', label: 'Book Resource', icon: 'cal', go: () => navigate('/bookings') },
  { id: 'qa3', group: 'Actions', label: 'Raise Maintenance Request', icon: 'wrench', go: () => navigate('/maintenance?new=1') },
  { id: 'qa4', group: 'Actions', label: 'Go to Reports', icon: 'chart', go: () => navigate('/reports') },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const { data: assets } = useQuery({
    queryKey: ['palette-assets', q],
    queryFn: () => assetsApi.list({ q, limit: 5 }),
    enabled: open && q.length > 0,
  });
  const { data: users } = useQuery({
    queryKey: ['palette-users', q],
    queryFn: () => usersApi.list({ q, limit: 5 }),
    enabled: open && q.length > 0,
  });

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const results = useMemo<Result[]>(() => {
    if (!q) return QUICK_ACTIONS(navigate);
    const r: Result[] = [];
    for (const a of assets?.data ?? []) {
      r.push({ id: a.id, group: 'Assets', label: a.name, sub: a.assetTag, icon: 'box', go: () => navigate(`/assets/${a.id}`) });
    }
    for (const u of users?.data ?? []) {
      r.push({ id: u.id, group: 'People', label: u.name, sub: u.email, icon: 'user', go: () => navigate('/organization') });
    }
    return r;
  }, [q, assets, users, navigate]);

  if (!open) return null;

  const groups = Array.from(new Set(results.map((r) => r.group)));

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 12, boxShadow: '0 24px 60px rgba(15,23,42,.35)', overflow: 'hidden', animation: 'af-modal .15s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon name="search" size={16} color="var(--text-3)" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search assets, people, actions…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: 'var(--text)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px' }}>Esc</span>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', padding: '8px 10px 4px' }}>{g}</div>
              {results
                .filter((r) => r.group === g)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      r.go();
                      onClose();
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <Icon name={r.icon} size={15} color="var(--text-2)" />
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.label}</span>
                    {r.sub && <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{r.sub}</span>}
                  </button>
                ))}
            </div>
          ))}
          {q && results.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>No results</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
