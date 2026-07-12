import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { useAssets, useCategories, useCreateAsset } from '../api/hooks';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';
import { healthColor } from '../lib/status';
import type { Asset, AssetCondition } from '../types';

export function Assets() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [showRegister, setShowRegister] = useState(params.get('new') === '1');
  const navigate = useNavigate();
  const can = useCan();

  const { data, isLoading } = useAssets({ q: q || undefined, status: status || undefined, limit: 50 });

  const columns: Column<Asset>[] = [
    {
      key: 'tag',
      header: 'Tag',
      width: '100px',
      render: (a) => <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{a.assetTag}</span>,
    },
    { key: 'name', header: 'Name', render: (a) => <span style={{ fontWeight: 600 }}>{a.name}</span> },
    { key: 'category', header: 'Category', render: (a) => a.category?.name ?? '—' },
    { key: 'status', header: 'Status', render: (a) => <Badge status={a.status} /> },
    {
      key: 'holder',
      header: 'Holder',
      render: (a) => a.currentAllocation?.holderUser?.name ?? a.currentAllocation?.holderDepartment?.name ?? '—',
    },
    { key: 'location', header: 'Location', render: (a) => a.location ?? '—' },
    {
      key: 'health',
      header: 'Health',
      render: (a) => (
        <span style={{ fontWeight: 700, fontSize: 12.5, color: healthColor(a.healthScore) }}>{a.healthScore}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Register and track assets through their lifecycle."
        actions={
          can.manageAssets && <Button variant="primary" leftIcon="plus" onClick={() => setShowRegister(true)}>Register Asset</Button>
        }
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input placeholder="Search by tag, name, serial…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setParams(e.target.value ? { status: e.target.value } : {});
          }}
          style={{ width: 200 }}
        >
          <option value="">All statuses</option>
          {['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </Select>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={isLoading}
        onRowClick={(a) => navigate(`/assets/${a.id}`)}
        emptyTitle="No assets found"
        emptyDescription="Register your first asset to get started."
        emptyAction={can.manageAssets && <Button variant="primary" onClick={() => setShowRegister(true)}>Register Asset</Button>}
      />
      {showRegister && <RegisterAssetModal onClose={() => setShowRegister(false)} />}
    </div>
  );
}

function RegisterAssetModal({ onClose }: { onClose: () => void }) {
  const { data: categories } = useCategories();
  const createAsset = useCreateAsset();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [location, setLocation] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim() || !categoryId) return setError('Name and category are required.');
    const form = new FormData();
    form.append('name', name);
    form.append('categoryId', categoryId);
    if (serialNumber) form.append('serialNumber', serialNumber);
    if (acquisitionDate) form.append('acquisitionDate', acquisitionDate);
    if (acquisitionCost) form.append('acquisitionCost', acquisitionCost);
    form.append('condition', condition);
    if (location) form.append('location', location);
    form.append('isBookable', String(isBookable));
    try {
      await createAsset.mutateAsync(form);
      toast('success', `${name} registered successfully.`);
      onClose();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Register Asset" width={480}>
      {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder='MacBook Pro 14" M3' />
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select category…</option>
          {(categories?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Input label="Serial number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Optional" />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Input label="Acquisition date" type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Cost (₹)" type="number" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
          </div>
        </div>
        <Select label="Condition" value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
          {['NEW', 'GOOD', 'FAIR', 'POOR'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="HQ Floor 2" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={isBookable} onChange={(e) => setIsBookable(e.target.checked)} />
          Shared / bookable resource
        </label>
        <Button variant="primary" isLoading={createAsset.isPending} onClick={() => void submit()}>Register Asset</Button>
      </div>
    </Modal>
  );
}
