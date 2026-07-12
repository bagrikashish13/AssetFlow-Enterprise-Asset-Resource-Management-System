import { Icon } from '../../lib/icons';
import { Skeleton } from './Skeleton';

export function KpiCard({
  icon,
  tileBg,
  tileColor,
  value,
  label,
  onClick,
  loading,
}: {
  icon: string;
  tileBg: string;
  tileColor: string;
  value: number | string;
  label: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(15,23,42,.05)',
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s ease-out, box-shadow .15s ease-out',
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = '#c7d2fe';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,.05)';
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: tileBg,
          color: tileColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon name={icon} size={17} />
      </div>
      {loading ? (
        <Skeleton width={56} height={28} />
      ) : (
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </button>
  );
}
