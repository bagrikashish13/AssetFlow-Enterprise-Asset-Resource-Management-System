import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addWeeks, format, subWeeks } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAssets, useBookings, useCancelBooking } from '../api/hooks';
import { WeekCalendar, getWeekStart } from '../components/domain/WeekCalendar';
import { BookingModal } from '../components/domain/BookingModal';
import { Icon } from '../lib/icons';
import { fmtDateTime } from '../lib/format';
import { useToast } from '../app/toast';
import type { Booking } from '../types';

export function Bookings() {
  const [params] = useSearchParams();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [resourceQ, setResourceQ] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(params.get('asset') ?? '');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showBookingModal, setShowBookingModal] = useState<{ assetId?: string; start?: Date } | null>(null);
  const { toast } = useToast();

  const { data: assets } = useAssets({ isBookable: true, limit: 100 });
  const bookableAssets = useMemo(() => (assets?.data ?? []).filter((a) => a.isBookable), [assets]);
  const filteredResources = bookableAssets.filter((a) => a.name.toLowerCase().includes(resourceQ.toLowerCase()));
  const activeAsset = bookableAssets.find((a) => a.id === selectedAssetId) ?? filteredResources[0];

  const { data: bookings } = useBookings({ assetId: activeAsset?.id, limit: 200 });
  const { data: allBookings } = useBookings({ limit: 200 });
  const cancelBooking = useCancelBooking();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Bookings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)' }}>Reserve shared rooms and equipment by time slot.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--line)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setView('calendar')} style={{ background: view === 'calendar' ? 'var(--surface)' : 'transparent', color: view === 'calendar' ? 'var(--text)' : 'var(--text-2)', border: 'none', borderRadius: 6, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Calendar</button>
            <button onClick={() => setView('list')} style={{ background: view === 'list' ? 'var(--surface)' : 'transparent', color: view === 'list' ? 'var(--text)' : 'var(--text-2)', border: 'none', borderRadius: 6, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>List view</button>
          </div>
          <Button variant="primary" leftIcon="plus" onClick={() => setShowBookingModal({})}>Book Resource</Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 280, minWidth: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
              <Input placeholder="Search resources…" value={resourceQ} onChange={(e) => setResourceQ(e.target.value)} />
            </div>
            {filteredResources.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedAssetId(r.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  width: '100%',
                  textAlign: 'left',
                  background: r.id === activeAsset?.id ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  borderLeft: r.id === activeAsset?.id ? '3px solid #4f46e5' : '3px solid transparent',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 8, background: 'var(--line)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="door" size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.location ?? '—'}</div>
                </div>
              </button>
            ))}
            {filteredResources.length === 0 && <EmptyState icon="cal" title="No bookable resources" />}
          </div>

          {activeAsset ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)', marginRight: 8 }}>{format(weekStart, 'd MMM')} – {format(addWeeks(weekStart, 1), 'd MMM yyyy')}</span>
                <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 7, padding: '5px 9px', fontSize: 13, cursor: 'pointer' }}>←</button>
                <button onClick={() => setWeekStart(getWeekStart(new Date()))} style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 7, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Today</button>
                <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 7, padding: '5px 9px', fontSize: 13, cursor: 'pointer' }}>→</button>
              </div>
              <WeekCalendar
                weekStart={weekStart}
                bookings={bookings?.data ?? []}
                resourceName={activeAsset.name}
                onSlotClick={(day, hour) => {
                  const start = new Date(day);
                  start.setHours(hour, 0, 0, 0);
                  setShowBookingModal({ assetId: activeAsset.id, start });
                }}
                onBookingClick={() => {}}
              />
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <EmptyState icon="cal" title="Select a resource" />
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {(allBookings?.data ?? []).length === 0 ? (
            <EmptyState icon="cal" title="No bookings yet" />
          ) : (
            (allBookings?.data ?? []).map((b: Booking) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.asset?.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{b.purpose} · {b.bookedBy?.name}</div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{fmtDateTime(b.startAt)}</span>
                <Badge status={b.phase} />
                {(b.phase === 'UPCOMING' || b.phase === 'ONGOING') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void cancelBooking.mutateAsync(b.id).then(() => toast('success', 'Booking cancelled.'))}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showBookingModal && (
        <BookingModal
          assets={bookableAssets}
          defaultAssetId={showBookingModal.assetId}
          defaultStart={showBookingModal.start}
          onClose={() => setShowBookingModal(null)}
        />
      )}
    </div>
  );
}
