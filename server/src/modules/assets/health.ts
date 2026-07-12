import {
  AssetCondition,
  MaintenancePriority,
  MaintenanceStatus,
} from '@prisma/client';

export type HealthScore = {
  score: number;
  band: 'HEALTHY' | 'MONITOR' | 'AT_RISK';
};

export function calculateAssetHealth(
  condition: AssetCondition,
  acquisitionDate: Date | null,
  maintenanceRequests: Array<{
    status: MaintenanceStatus;
    priority: MaintenancePriority;
    createdAt: Date;
  }>,
): HealthScore {
  let score = 100;

  // 1. Condition penalty
  switch (condition) {
    case 'NEW':
      score -= 0;
      break;
    case 'GOOD':
      score -= 5;
      break;
    case 'FAIR':
      score -= 15;
      break;
    case 'POOR':
      score -= 30;
      break;
  }

  // 2. Age penalty: min(20, full_years_since_acquisition × 4)
  if (acquisitionDate) {
    const ageInMs = Date.now() - acquisitionDate.getTime();
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    const fullYears = Math.floor(ageInYears);
    if (fullYears > 0) {
      score -= Math.min(20, fullYears * 4);
    }
  }

  // 3. Maintenance load: min(30, maintenance_requests_in_last_12_months × 6)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentRequests = maintenanceRequests.filter(
    (req) => req.createdAt >= oneYearAgo,
  );
  if (recentRequests.length > 0) {
    score -= Math.min(30, recentRequests.length * 6);
  }

  // 4. Critical open maintenance penalty
  const hasOpenCritical = maintenanceRequests.some(
    (req) =>
      req.priority === 'CRITICAL' &&
      ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS'].includes(req.status),
  );
  if (hasOpenCritical) {
    score -= 10;
  }

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, score));

  // Determine band
  let band: 'HEALTHY' | 'MONITOR' | 'AT_RISK' = 'AT_RISK';
  if (score >= 80) {
    band = 'HEALTHY';
  } else if (score >= 50) {
    band = 'MONITOR';
  }

  return { score, band };
}
