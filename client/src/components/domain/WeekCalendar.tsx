import { addDays, format, startOfWeek } from 'date-fns';
import { statusColor } from '../../lib/status';
import type { Booking } from '../../types';

const DAY_START = 7;
const DAY_END = 21;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const PX_PER_HOUR = 48;
const GRID_HEIGHT = HOURS.length * PX_PER_HOUR;

function topFor(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  return (hours - DAY_START) * PX_PER_HOUR;
}

export function WeekCalendar({
  weekStart,
  bookings,
  resourceName,
  onSlotClick,
  onBookingClick,
}: {
  weekStart: Date;
  bookings: Booking[];
  resourceName: string;
  onSlotClick: (day: Date, hour: number) => void;
  onBookingClick: (b: Booking) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 700 }}>{resourceName}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        <div />
        {days.map((d) => {
          const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          return (
            <div key={d.toISOString()} style={{ textAlign: 'center', padding: '9px 4px', background: isToday ? '#eef2ff' : 'transparent', borderLeft: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#4338ca' : 'var(--text-2)', textTransform: 'uppercase' }}>{format(d, 'EEE')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? '#4338ca' : 'var(--text)' }}>{format(d, 'd')}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', maxHeight: 600, overflowY: 'auto' }}>
        <div style={{ position: 'relative', height: GRID_HEIGHT }}>
          {HOURS.map((h) => (
            <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * PX_PER_HOUR, right: 6, fontSize: 10.5, color: 'var(--text-3)', transform: 'translateY(-50%)' }}>
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter((b) => format(new Date(b.startAt), 'yyyy-MM-dd') === dayKey && b.status === 'CONFIRMED');
          const isToday = dayKey === format(today, 'yyyy-MM-dd');
          const nowTop = isToday ? topFor(today) : null;
          return (
            <div
              key={dayKey}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / PX_PER_HOUR) + DAY_START;
                onSlotClick(day, hour);
              }}
              style={{ position: 'relative', height: GRID_HEIGHT, borderLeft: '1px solid var(--line)', cursor: 'pointer' }}
            >
              {HOURS.map((h) => (
                <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h - DAY_START) * PX_PER_HOUR, borderTop: '1px solid var(--line)' }} />
              ))}
              {nowTop !== null && nowTop >= 0 && nowTop <= GRID_HEIGHT && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, borderTop: '2px solid #f43f5e', zIndex: 5 }}>
                  <span style={{ position: 'absolute', left: -4, top: -4, width: 7, height: 7, borderRadius: 99, background: '#f43f5e' }} />
                </div>
              )}
              {dayBookings.map((b) => {
                const start = new Date(b.startAt);
                const end = new Date(b.endAt);
                const top = Math.max(0, topFor(start));
                const height = Math.max(20, topFor(end) - top);
                const c = statusColor(b.phase);
                return (
                  <button
                    key={b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(b);
                    }}
                    style={{
                      position: 'absolute',
                      left: 4,
                      right: 4,
                      top,
                      height,
                      background: c.bg,
                      border: `1px solid ${c.ring}`,
                      borderLeft: `3px solid ${c.solid}`,
                      borderRadius: 7,
                      padding: '4px 7px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      zIndex: 4,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: c.text }}>{format(start, 'HH:mm')}–{format(end, 'HH:mm')}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.purpose}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}
