import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { IconButton } from '../components/ui/IconButton';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { Heatmap } from '../components/charts/Heatmap';
import {
  useStatusDistribution,
  useUtilization,
  useIdleAssets,
  useMaintenanceFrequency,
  useMaintenanceCostTrend,
  useDepartmentAllocation,
  useBookingHeatmap,
  useHealthDistribution,
} from '../api/hooks';
import { reportsApi } from '../api/endpoints';

function ReportCard({ title, csvName, children }: { title: string; csvName: string; children: React.ReactNode }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</span>
        <a href={reportsApi.csvUrl(csvName)} download>
          <IconButton icon="copy" size={14} title="Export CSV" />
        </a>
      </div>
      {children}
    </Card>
  );
}

export function Reports() {
  const statusDist = useStatusDistribution();
  const utilization = useUtilization();
  const idle = useIdleAssets();
  const maintFreq = useMaintenanceFrequency();
  const maintCost = useMaintenanceCostTrend();
  const deptAlloc = useDepartmentAllocation();
  const heatmap = useBookingHeatmap();
  const health = useHealthDistribution();

  return (
    <div>
      <PageHeader title="Reports" description="Operational insight across assets, maintenance, and bookings." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <ReportCard title="Asset Status Distribution" csvName="status-distribution">
          <DonutChart data={statusDist.data ?? []} />
        </ReportCard>

        <ReportCard title="Most-Used Assets" csvName="utilization">
          <BarChart data={(utilization.data ?? []).map((u) => ({ label: u.name, value: u.allocationCount }))} />
        </ReportCard>

        <ReportCard title="Maintenance Frequency by Category" csvName="maintenance-frequency">
          <BarChart color="#d97706" data={(maintFreq.data ?? []).map((m) => ({ label: m.category, value: m.count }))} />
        </ReportCard>

        <ReportCard title="Department Allocation Summary" csvName="department-allocation">
          <BarChart color="#0284c7" data={(deptAlloc.data ?? []).map((d) => ({ label: d.department, value: d.allocated }))} />
        </ReportCard>

        <ReportCard title="Booking Heatmap" csvName="booking-heatmap">
          <Heatmap data={heatmap.data ?? []} />
        </ReportCard>

        <ReportCard title="Health Distribution" csvName="status-distribution">
          <DonutChart data={(health.data?.distribution ?? []).map((d) => ({ status: d.band === 'HEALTHY' ? 'AVAILABLE' : d.band === 'MONITOR' ? 'RESERVED' : 'LOST', count: d.count }))} />
          {(health.data?.atRisk.length ?? 0) > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>AT RISK</div>
              {health.data!.atRisk.slice(0, 5).map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                  <span>{a.name}</span>
                  <span style={{ fontWeight: 700, color: '#e11d48' }}>{a.score}</span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>

        <ReportCard title="Maintenance Cost Trend" csvName="maintenance-cost-trend">
          <BarChart color="#7c3aed" data={(maintCost.data ?? []).map((m) => ({ label: m.month, value: m.cost }))} />
        </ReportCard>

        <ReportCard title="Idle Assets (30+ days)" csvName="idle-assets">
          {(idle.data ?? []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 12 }}>No idle assets</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(idle.data ?? []).map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span>{a.name}</span>
                  <span style={{ color: 'var(--text-3)' }}>{a.location ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>
    </div>
  );
}
