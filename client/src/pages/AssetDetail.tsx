import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsset, useAssetHistory, useRetireAsset, useMarkFound } from '../api/hooks';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { healthBandLabel, healthColor } from '../lib/status';
import { fmtDate, fmtInr } from '../lib/format';
import { Icon } from '../lib/icons';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { AllocateModal } from '../components/domain/AllocateModal';
import { MaintenanceModal } from '../components/domain/MaintenanceModal';
import { ReturnModal } from '../components/domain/ReturnModal';
import { TransferModal } from '../components/domain/TransferModal';

type Tab = 'overview' | 'allocations' | 'maintenance';

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id);
  const { data: history } = useAssetHistory(id);
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<'allocate' | 'return' | 'maintenance' | 'transfer' | null>(null);
  const can = useCan();
  const { toast } = useToast();
  const retire = useRetireAsset();
  const markFound = useMarkFound();

  if (isLoading || !asset) {
    return (
      <div>
        <Skeleton height={120} />
      </div>
    );
  }

  const ring = healthColor(asset.healthScore);
  const circumference = 2 * Math.PI * 30;
  const offset = circumference * (1 - asset.healthScore / 100);

  return (
    <div>
      <button onClick={() => navigate('/assets')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}>
        <Icon name="chevL" size={14} /> Back to Assets
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {asset.photoUrl ? <img src={asset.photoUrl} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="box" size={28} color="var(--text-3)" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>{asset.name}</h1>
            <Badge status={asset.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>{asset.assetTag}</span>
            {asset.department && <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{asset.department.name}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx={36} cy={36} r={30} fill="none" stroke="var(--line)" strokeWidth={6} />
            <circle
              cx={36}
              cy={36}
              r={30}
              fill="none"
              stroke={ring}
              strokeWidth={6}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
            />
            <text x={36} y={40} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--text)">{asset.healthScore}</text>
          </svg>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: ring }}>{healthBandLabel(asset.healthScore)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Health score</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {can.manageAssets && asset.status === 'AVAILABLE' && <Button variant="primary" leftIcon="swap" onClick={() => setModal('allocate')}>Allocate</Button>}
          {asset.status === 'ALLOCATED' && <Button variant="secondary" onClick={() => setModal('transfer')}>Request Transfer</Button>}
          {can.manageAssets && asset.status === 'ALLOCATED' && <Button variant="secondary" onClick={() => setModal('return')}>Return</Button>}
          {asset.status !== 'RETIRED' && asset.status !== 'DISPOSED' && <Button variant="secondary" leftIcon="wrench" onClick={() => setModal('maintenance')}>Raise Maintenance</Button>}
          {asset.isBookable && <Button variant="secondary" leftIcon="cal" onClick={() => navigate(`/bookings?asset=${asset.id}`)}>Book</Button>}
          {can.manageAssets && asset.status === 'LOST' && (
            <Button variant="secondary" onClick={() => void markFound.mutateAsync(asset.id).then(() => toast('success', 'Marked as found.'))}>Mark Found</Button>
          )}
          {can.manageAssets && ['AVAILABLE'].includes(asset.status) && (
            <Button variant="outline" onClick={() => void retire.mutateAsync(asset.id).then(() => toast('success', 'Asset retired.'))}>Retire</Button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          ['Category', asset.category?.name ?? '—'],
          ['Serial', asset.serialNumber ?? '—'],
          ['Acquired', fmtDate(asset.acquisitionDate)],
          ['Cost', fmtInr(asset.acquisitionCost)],
          ['Condition', asset.condition],
          ['Location', asset.location ?? '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'allocations', label: 'Allocation History', count: history?.allocations.length },
          { value: 'maintenance', label: 'Maintenance History', count: history?.maintenance.length },
        ]}
      />

      {tab === 'overview' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          {asset.customFieldValues && Object.keys(asset.customFieldValues).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {Object.entries(asset.customFieldValues).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="info" title="No additional details" />
          )}
        </div>
      )}

      {tab === 'allocations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(history?.allocations ?? []).length === 0 && <EmptyState icon="swap" title="No allocation history" />}
          {(history?.allocations ?? []).map((a) => (
            <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.holderUser?.name ?? a.holderDepartment?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {fmtDate(a.allocatedAt)} {a.returnedAt ? `→ ${fmtDate(a.returnedAt)}` : '(active)'}
                </div>
              </div>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      )}

      {tab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(history?.maintenance ?? []).length === 0 && <EmptyState icon="wrench" title="No maintenance history" />}
          {(history?.maintenance ?? []).map((m) => (
            <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{fmtDate(m.createdAt)}</div>
              </div>
              <Badge status={m.status} />
            </div>
          ))}
        </div>
      )}

      {modal === 'allocate' && <AllocateModal asset={asset} onClose={() => setModal(null)} />}
      {modal === 'return' && asset.currentAllocation && <ReturnModal allocationId={asset.currentAllocation.id} onClose={() => setModal(null)} />}
      {modal === 'maintenance' && <MaintenanceModal assetId={asset.id} onClose={() => setModal(null)} />}
      {modal === 'transfer' && <TransferModal asset={asset} onClose={() => setModal(null)} />}
    </div>
  );
}
