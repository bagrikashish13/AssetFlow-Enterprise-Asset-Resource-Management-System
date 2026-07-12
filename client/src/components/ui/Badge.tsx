import { statusColor, statusLabel } from '../../lib/status';

export function Badge({ status, label }: { status: string; label?: string }) {
  const c = statusColor(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 700,
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.ring}`,
        borderRadius: 999,
        padding: '2px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: 999, background: c.dot }} />
      {label ?? statusLabel(status)}
    </span>
  );
}
