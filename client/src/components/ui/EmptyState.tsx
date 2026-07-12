import type { ReactNode } from 'react';
import { Icon } from '../../lib/icons';

export function EmptyState({
  icon = 'box',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '56px 24px' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          color: 'var(--text-3)',
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, maxWidth: 360 }}>{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
