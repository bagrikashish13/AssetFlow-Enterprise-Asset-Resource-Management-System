import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAudit, useAuditRecords, useAuditDiscrepancies, useRecordVerdict, useCloseAudit } from '../api/hooks';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../lib/icons';
import { fmtDate } from '../lib/format';
import { useCan } from '../app/auth';
import { useToast } from '../app/toast';
import { apiError } from '../api/client';
import type { AuditResult } from '../types';

const RESULTS: AuditResult[] = ['VERIFIED', 'MISSING', 'DAMAGED'];
const RESULT_COLOR: Record<AuditResult, string> = { VERIFIED: '#059669', MISSING: '#e11d48', DAMAGED: '#d97706' };

export function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = useCan();
  const { toast } = useToast();
  const { data: cycle } = useAudit(id);
  const { data: records } = useAuditRecords(id);
  const { data: discrepancies } = useAuditDiscrepancies(id);
  const recordVerdict = useRecordVerdict();
  const closeAudit = useCloseAudit();
  const [confirmClose, setConfirmClose] = useState(false);

  if (!cycle) return null;
  const closed = cycle.status === 'CLOSED';
  const circumference = 2 * Math.PI * 26;
  const pct = cycle.progress.total > 0 ? cycle.progress.checked / cycle.progress.total : 0;
  const offset = circumference * (1 - pct);

  return (
    <div>
      <button onClick={() => navigate('/audits')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}>
        <Icon name="chevL" size={14} /> Back to Audits
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={26} fill="none" stroke="var(--line)" strokeWidth={6} />
          <circle cx={32} cy={32} r={26} fill="none" stroke="#4f46e5" strokeWidth={6} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 32 32)" />
        </svg>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{cycle.name}</h1>
            <Badge status={cycle.status} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
            {cycle.department?.name ?? 'Org-wide'} · {fmtDate(cycle.startDate)} – {fmtDate(cycle.endDate)} · {cycle.progress.checked}/{cycle.progress.total} checked
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', background: '#ecfdf5', borderRadius: 999, padding: '3px 10px' }}>{cycle.progress.verified} verified</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#e11d48', background: '#fff1f2', borderRadius: 999, padding: '3px 10px' }}>{cycle.progress.missing} missing</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#d97706', background: '#fffbeb', borderRadius: 999, padding: '3px 10px' }}>{cycle.progress.damaged} damaged</span>
        </div>
        {!closed && can.isAdmin && (
          <Button variant="danger" onClick={() => setConfirmClose(true)}>Close Cycle</Button>
        )}
      </div>

      {(discrepancies?.length ?? 0) > 0 && (
        <div style={{ background: '#fff1f2', border: '1px solid rgba(225,29,72,.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#be123c', marginBottom: 10 }}>Discrepancy Report</div>
          {discrepancies?.map((d) => (
            <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
              <Badge status={d.result ?? ''} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{d.asset?.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.notes}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {(records ?? []).map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{r.asset?.assetTag}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.asset?.name} · {r.asset?.location ?? '—'}</div>
            </div>
            {!closed ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {RESULTS.map((res) => {
                  const active = r.result === res;
                  return (
                    <button
                      key={res}
                      onClick={() =>
                        void recordVerdict
                          .mutateAsync({ cycleId: id!, recordId: r.id, body: { result: res } })
                          .catch((e) => toast('error', apiError(e).message))
                      }
                      style={{ border: active ? `1px solid ${RESULT_COLOR[res]}` : '1px solid var(--border)', background: active ? `${RESULT_COLOR[res]}18` : 'transparent', color: active ? RESULT_COLOR[res] : 'var(--text-2)', borderRadius: 7, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {res}
                    </button>
                  );
                })}
              </div>
            ) : (
              r.result && <Badge status={r.result} />
            )}
          </div>
        ))}
      </div>

      {confirmClose && (
        <div onClick={() => setConfirmClose(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: 420, maxWidth: '92vw' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700 }}>Close audit cycle?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Confirmed-missing assets will be marked <b>Lost</b>. This action locks the cycle permanently.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="danger"
                isLoading={closeAudit.isPending}
                onClick={() =>
                  void closeAudit.mutateAsync(id!).then(() => { toast('success', 'Audit cycle closed.'); setConfirmClose(false); })
                }
              >
                Close Cycle
              </Button>
              <Button variant="outline" onClick={() => setConfirmClose(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
