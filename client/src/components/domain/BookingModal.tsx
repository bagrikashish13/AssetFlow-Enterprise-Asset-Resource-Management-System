import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { useCreateBooking } from '../../api/hooks';
import { useToast } from '../../app/toast';
import { apiError } from '../../api/client';
import { fmtDateTime } from '../../lib/format';
import { Icon } from '../../lib/icons';
import type { Asset, SlotSuggestion } from '../../types';

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BookingModal({
  assets,
  defaultAssetId,
  defaultStart,
  onClose,
}: {
  assets: Asset[];
  defaultAssetId?: string;
  defaultStart?: Date;
  onClose: () => void;
}) {
  const [assetId, setAssetId] = useState(defaultAssetId ?? '');
  const [purpose, setPurpose] = useState('');
  const [startAt, setStartAt] = useState(defaultStart ? toLocalInput(defaultStart) : '');
  const [endAt, setEndAt] = useState(defaultStart ? toLocalInput(new Date(defaultStart.getTime() + 60 * 60 * 1000)) : '');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const createBooking = useCreateBooking();
  const { toast } = useToast();

  const submit = async () => {
    setError('');
    setSuggestions([]);
    if (!assetId || !purpose.trim() || !startAt || !endAt) return setError('Fill in all fields.');
    try {
      await createBooking.mutateAsync({
        assetId,
        purpose,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      });
      toast('success', 'Booking confirmed.');
      onClose();
    } catch (err) {
      const e = apiError(err);
      setError(e.message);
      if (e.errorCode === 'BOOKING_OVERLAP' && e.suggestions) setSuggestions(e.suggestions);
    }
  };

  const applySuggestion = (s: SlotSuggestion) => {
    setStartAt(toLocalInput(new Date(s.startAt)));
    setEndAt(toLocalInput(new Date(s.endAt)));
    setSuggestions([]);
    setError('');
  };

  return (
    <Modal open onClose={onClose} title="Book Resource">
      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid rgba(225,29,72,.2)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: suggestions.length ? 10 : 0 }}>
            <Icon name="alert" size={14} color="#e11d48" />
            <span style={{ fontSize: 13, color: '#be123c' }}>{error}</span>
          </div>
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {suggestions.map((s) => (
                <button
                  key={s.startAt}
                  onClick={() => applySuggestion(s)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}
                >
                  {fmtDateTime(s.startAt)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Resource" value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={!!defaultAssetId}>
          <option value="">Select…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Input label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Team standup" />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Input label="Start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="End" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" isLoading={createBooking.isPending} onClick={() => void submit()}>Confirm Booking</Button>
      </div>
    </Modal>
  );
}
