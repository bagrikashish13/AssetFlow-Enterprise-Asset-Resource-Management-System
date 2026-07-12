import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { KpiCard } from '../components/ui/KpiCard';
import { Icon } from '../lib/icons';
import { fmtDate } from '../lib/format';
import { EmptyState } from '../components/ui/EmptyState';
import { useKpis, useOverdue, useUpcomingReturns, useTodayBookings } from '../api/hooks';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const TILE = {
  available: { bg: '#ecfdf5', color: '#059669' },
  allocated: { bg: '#eef2ff', color: '#4f46e5' },
  maintenance: { bg: '#fffbeb', color: '#d97706' },
  bookings: { bg: '#f0f9ff', color: '#0284c7' },
  transfers: { bg: '#f5f3ff', color: '#7c3aed' },
  returns: { bg: '#fff1f2', color: '#e11d48' },
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useKpis();
  const { data: overdue } = useOverdue();
  const { data: upcoming } = useUpcomingReturns();
  const { data: todayBookings } = useTodayBookings();
  const managerView = user?.role !== 'EMPLOYEE';

  const kpiTiles = [
    { icon: 'box', ...TILE.available, value: kpis?.assetsAvailable, label: 'Assets Available', go: () => navigate('/assets?status=AVAILABLE') },
    { icon: 'swap', ...TILE.allocated, value: kpis?.assetsAllocated, label: 'Assets Allocated', go: () => navigate('/assets?status=ALLOCATED') },
    { icon: 'wrench', ...TILE.maintenance, value: kpis?.maintenanceToday, label: 'Maintenance In Progress', go: () => navigate('/maintenance') },
    { icon: 'cal', ...TILE.bookings, value: kpis?.activeBookings, label: 'Active Bookings', go: () => navigate('/bookings') },
    { icon: 'clip', ...TILE.transfers, value: kpis?.pendingTransfers, label: 'Pending Transfers', go: () => navigate('/allocations') },
    { icon: 'alert', ...TILE.returns, value: kpis?.overdueReturns, label: 'Overdue Returns', go: () => navigate('/allocations') },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Dashboard</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: '#059669', background: '#ecfdf5', border: '1px solid rgba(5,150,105,.2)', borderRadius: 999, padding: '2px 8px', letterSpacing: '.05em' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10b981', animation: 'af-pulse 2s ease-in-out infinite' }} />
              LIVE
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)' }}>Welcome back, {user?.name.split(' ')[0]}.</p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(new Date().toISOString())}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpiTiles.map((k) => (
          <KpiCard key={k.label} icon={k.icon} tileBg={k.bg} tileColor={k.color} value={k.value ?? 0} label={k.label} onClick={k.go} loading={isLoading} />
        ))}
      </div>

      {managerView && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(225,29,72,.25)', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,.05)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#fff1f2', borderBottom: '1px solid rgba(225,29,72,.15)' }}>
              <Icon name="alert" size={16} color="#e11d48" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#be123c' }}>Overdue Returns</span>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#e11d48', color: '#fff', borderRadius: 999, padding: '1px 8px' }}>{overdue?.length ?? 0}</span>
            </div>
            {(overdue ?? []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Nothing overdue</div>
            ) : (
              (overdue ?? []).slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => navigate(`/assets/${r.assetId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>
                      {r.asset?.name}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{r.holderUser?.name ?? r.holderDepartment?.name} · due {fmtDate(r.expectedReturnAt)}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#be123c', background: '#fff1f2', border: '1px solid rgba(225,29,72,.2)', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                    {r.daysOverdue}d overdue
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Upcoming Returns</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>next 7 days</span>
            </div>
            {(upcoming ?? []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Nothing due soon</div>
            ) : (
              (upcoming ?? []).slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => navigate(`/assets/${r.assetId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>
                      {r.asset?.name}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{r.holderUser?.name ?? r.holderDepartment?.name}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(r.expectedReturnAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,.05)', overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 700 }}>Today's Bookings</div>
        {(todayBookings ?? []).length === 0 ? (
          <EmptyState icon="cal" title="No bookings today" />
        ) : (
          <div style={{ display: 'flex', overflowX: 'auto', gap: 12, padding: 16 }}>
            {(todayBookings ?? []).map((b) => (
              <div key={b.id} style={{ minWidth: 180, border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(b.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{b.asset?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{b.bookedBy?.name}</div>
                <div style={{ marginTop: 8 }}>
                  <Badge status={b.phase} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,.05)', padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {user?.role !== 'EMPLOYEE' && (
            <Button leftIcon="plus" onClick={() => navigate('/assets?new=1')}>Register Asset</Button>
          )}
          <Button leftIcon="cal" onClick={() => navigate('/bookings')}>Book Resource</Button>
          <Button leftIcon="wrench" onClick={() => navigate('/maintenance?new=1')}>Raise Maintenance Request</Button>
        </div>
      </div>
    </div>
  );
}
