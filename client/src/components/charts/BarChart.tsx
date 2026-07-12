export function BarChart({ data, color = '#4f46e5' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
          <div style={{ flex: 1, background: 'var(--line)', borderRadius: 6, height: 18, position: 'relative' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: color, height: '100%', borderRadius: 6, transition: 'width .3s ease-out' }} />
          </div>
          <div style={{ width: 32, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{d.value}</div>
        </div>
      ))}
      {data.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', padding: 12, textAlign: 'center' }}>No data</div>}
    </div>
  );
}
