import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateAssetHealth } from '../assets/health';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  statusDistribution() {
    return this.prisma.$queryRaw`
      SELECT status, COUNT(*)::int AS count
      FROM assets
      GROUP BY status
      ORDER BY count DESC
    `;
  }

  utilization() {
    return this.prisma.$queryRaw`
      SELECT a.id, a.asset_tag AS "assetTag", a.name,
             COUNT(al.id)::int AS "allocationCount"
      FROM assets a
      LEFT JOIN allocations al ON al.asset_id = a.id
      GROUP BY a.id, a.asset_tag, a.name
      ORDER BY "allocationCount" DESC, a.name
      LIMIT 10
    `;
  }

  idleAssets() {
    return this.prisma.$queryRaw`
      SELECT a.id, a.asset_tag AS "assetTag", a.name, a.location
      FROM assets a
      WHERE a.status = 'AVAILABLE'
        AND NOT EXISTS (
          SELECT 1 FROM allocations al
          WHERE al.asset_id = a.id
            AND al.allocated_at > now() - interval '30 days'
        )
      ORDER BY a.name
    `;
  }

  maintenanceFrequency() {
    return this.prisma.$queryRaw`
      SELECT c.name AS category, COUNT(m.id)::int AS count
      FROM asset_categories c
      LEFT JOIN assets a ON a.category_id = c.id
      LEFT JOIN maintenance_requests m ON m.asset_id = a.id
      GROUP BY c.name
      ORDER BY count DESC
    `;
  }

  maintenanceCostTrend() {
    return this.prisma.$queryRaw`
      SELECT to_char(date_trunc('month', resolved_at), 'YYYY-MM') AS month,
             COALESCE(SUM(cost), 0)::float AS cost
      FROM maintenance_requests
      WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `;
  }

  departmentAllocation() {
    return this.prisma.$queryRaw`
      SELECT d.name AS department, COUNT(a.id)::int AS allocated
      FROM departments d
      LEFT JOIN assets a ON a.department_id = d.id AND a.status = 'ALLOCATED'
      GROUP BY d.name
      ORDER BY allocated DESC
    `;
  }

  bookingHeatmap() {
    return this.prisma.$queryRaw`
      SELECT EXTRACT(DOW FROM start_at)::int AS dow,
             EXTRACT(HOUR FROM start_at)::int AS hour,
             COUNT(*)::int AS count
      FROM bookings
      WHERE status = 'CONFIRMED'
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
  }

  async healthDistribution() {
    const assets = await this.prisma.asset.findMany({
      where: { status: { not: 'DISPOSED' } },
      select: {
        id: true,
        name: true,
        assetTag: true,
        condition: true,
        acquisitionDate: true,
        maintenanceRequests: {
          select: { status: true, priority: true, createdAt: true },
        },
      },
    });

    const bands = { HEALTHY: 0, MONITOR: 0, AT_RISK: 0 };
    const atRisk: {
      id: string;
      assetTag: string;
      name: string;
      score: number;
    }[] = [];

    for (const asset of assets) {
      const health = calculateAssetHealth(
        asset.condition,
        asset.acquisitionDate,
        asset.maintenanceRequests,
      );
      bands[health.band] += 1;
      if (health.band === 'AT_RISK') {
        atRisk.push({
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          score: health.score,
        });
      }
    }

    atRisk.sort((a, b) => a.score - b.score);
    return {
      distribution: [
        { band: 'HEALTHY', count: bands.HEALTHY },
        { band: 'MONITOR', count: bands.MONITOR },
        { band: 'AT_RISK', count: bands.AT_RISK },
      ],
      atRisk,
    };
  }
}
