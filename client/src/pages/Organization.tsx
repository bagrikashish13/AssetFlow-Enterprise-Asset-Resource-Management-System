import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Field';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useDepartments,
  useCreateDepartment,
  useCategories,
  useCreateCategory,
  useUsers,
  useSetUserRole,
  useSetUserStatus,
  useResetPassword,
} from '../api/hooks';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';
import { ROLE_LABEL } from '../lib/format';
import type { Role } from '../types';

type Tab = 'departments' | 'categories' | 'employees';

export function Organization() {
  const [tab, setTab] = useState<Tab>('departments');
  return (
    <div>
      <PageHeader title="Organization" description="Maintain the master data everything else depends on." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'departments', label: 'Departments' },
          { value: 'categories', label: 'Asset Categories' },
          { value: 'employees', label: 'Employee Directory' },
        ]}
      />
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'employees' && <EmployeesTab />}
    </div>
  );
}

function DepartmentsTab() {
  const { data } = useDepartments();
  const createDept = useCreateDepartment();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Name is required.');
    try {
      await createDept.mutateAsync({ name, description: description || undefined, parentId: parentId || undefined });
      toast('success', 'Department created.');
      setShowCreate(false);
      setName('');
      setDescription('');
      setParentId('');
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="primary" leftIcon="plus" onClick={() => setShowCreate(true)}>Add Department</Button>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {(data?.data ?? []).length === 0 && <EmptyState icon="building" title="No departments yet" />}
        {(data?.data ?? []).map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.parentId ? `└ ${d.name}` : d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{d.head?.name ?? 'No head assigned'} · {d.memberCount ?? 0} members · {d.assetCount ?? 0} assets</div>
            </div>
            <Badge status={d.status} />
          </div>
        ))}
      </div>
      {showCreate && (
        <Modal open onClose={() => setShowCreate(false)} title="Add Department">
          {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Facilities" />
            <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Select label="Parent department (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None</option>
              {(data?.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Button variant="primary" isLoading={createDept.isPending} onClick={() => void submit()}>Create Department</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { data } = useCategories();
  const createCategory = useCreateCategory();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Name is required.');
    try {
      await createCategory.mutateAsync({ name, description: description || undefined, icon: 'box', fields: [] });
      toast('success', 'Category created.');
      setShowCreate(false);
      setName('');
      setDescription('');
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="primary" leftIcon="plus" onClick={() => setShowCreate(true)}>Add Category</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {(data?.data ?? []).map((c) => (
          <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>{c.assetCount ?? 0} assets</div>
            {c.fields.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {c.fields.map((f) => (
                  <span key={f.key} style={{ fontSize: 10.5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px', color: 'var(--text-2)' }}>{f.label}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {(data?.data ?? []).length === 0 && <EmptyState icon="box" title="No categories yet" />}
      </div>
      {showCreate && (
        <Modal open onClose={() => setShowCreate(false)} title="Add Category">
          {error && <div style={{ background: '#fff1f2', color: '#be123c', fontSize: 13, borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vehicles" />
            <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button variant="primary" isLoading={createCategory.isPending} onClick={() => void submit()}>Create Category</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const ROLES: Role[] = ['EMPLOYEE', 'DEPT_HEAD', 'ASSET_MANAGER'];

function EmployeesTab() {
  const { data } = useUsers({ limit: 200 });
  const setRole = useSetUserRole();
  const setStatus = useSetUserStatus();
  const resetPassword = useResetPassword();
  const { toast } = useToast();
  const [roleModalFor, setRoleModalFor] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {(data?.data ?? []).length === 0 && <EmptyState icon="user" title="No employees found" />}
        {(data?.data ?? []).map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <Avatar name={u.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.email} · {u.department?.name ?? 'No dept'}</div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4338ca', background: '#eef2ff', borderRadius: 999, padding: '2px 8px' }}>{ROLE_LABEL[u.role]}</span>
            <Badge status={u.status} />
            {u.role !== 'ADMIN' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setRoleModalFor(u.id)}>Change Role</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setStatus.mutateAsync({ id: u.id, status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                >
                  {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void resetPassword.mutateAsync(u.id).then((r) => setTempPassword(r.tempPassword))}
                >
                  Reset Password
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {roleModalFor && (
        <Modal open onClose={() => setRoleModalFor(null)} title="Change Role" width={380}>
          <div style={{ background: '#fffbeb', border: '1px solid rgba(217,119,6,.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#b45309', marginBottom: 14 }}>
            Role changes take effect immediately.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => void setRole.mutateAsync({ id: roleModalFor, role: r }).then(() => { toast('success', 'Role updated.'); setRoleModalFor(null); })}
                style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', background: 'transparent', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {tempPassword && (
        <Modal open onClose={() => setTempPassword(null)} title="Temporary Password" width={380}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Share this password securely. It's shown once.</p>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 15, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>{tempPassword}</div>
          <Button variant="primary" onClick={() => void navigator.clipboard.writeText(tempPassword)}>Copy</Button>
        </Modal>
      )}
    </div>
  );
}
