import { statusColor } from '../../lib/status';

export function DonutChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let cumulative = 0;
  const r = 46;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {data.map((d) => {
          const fraction = d.count / total;
          const dash = fraction * circumference;
          const offset = -cumulative * circumference;
          cumulative += fraction;
          return (
            <circle
              key={d.status}
              cx={60}
              cy={60}
              r={r}
              fill="none"
              stroke={statusColor(d.status).solid}
              strokeWidth={16}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x={60} y={65} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--text)">{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d) => (
          <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: statusColor(d.status).solid }} />
            <span style={{ color: 'var(--text-2)' }}>{d.status.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 700 }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
