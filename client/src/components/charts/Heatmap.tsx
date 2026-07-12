import { Fragment } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Heatmap({ data }: { data: { dow: number; hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const cell = (dow: number, hour: number) => data.find((d) => d.dow === dow && d.hour === hour)?.count ?? 0;
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${hours.length}, 20px)`, gap: 3, minWidth: 40 + hours.length * 23 }}>
        <div />
        {hours.map((h) => (
          <div key={h} style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center' }}>{h}</div>
        ))}
        {DAYS.map((d, dow) => (
          <Fragment key={d}>
            <div style={{ fontSize: 10.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center' }}>{d}</div>
            {hours.map((h) => {
              const v = cell(dow, h);
              const intensity = v / max;
              return (
                <div
                  key={`${d}-${h}`}
                  title={`${v} bookings`}
                  style={{ width: 20, height: 20, borderRadius: 4, background: intensity === 0 ? 'var(--line)' : `rgba(79,70,229,${0.15 + intensity * 0.75})` }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
