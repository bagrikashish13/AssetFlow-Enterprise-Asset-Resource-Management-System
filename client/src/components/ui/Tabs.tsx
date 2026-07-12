export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              color: active ? 'var(--text)' : 'var(--text-2)',
              cursor: 'pointer',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: active ? '#eef2ff' : 'var(--surface-2)',
                  color: active ? '#4338ca' : 'var(--text-3)',
                  borderRadius: 999,
                  padding: '1px 6px',
                }}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
