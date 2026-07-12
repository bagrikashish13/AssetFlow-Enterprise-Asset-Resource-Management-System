import 'dotenv/config';
import { PrismaClient, UserRole, AssetStatus, AssetCondition } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedOrganization() {
  const orgPath = path.join(__dirname, 'seed-data', 'organization.json');
  if (!fs.existsSync(orgPath)) {
    console.log('Skipping organization.json (not found).');
    return;
  }
  console.log('Seeding organization.json...');
  const data = JSON.parse(fs.readFileSync(orgPath, 'utf8'));

  // 1. Seed base Departments (no relations)
  if (data.departments) {
    for (const d of data.departments) {
      await prisma.department.upsert({
        where: { name: d.name },
        update: { description: d.description },
        create: {
          name: d.name,
          description: d.description
        }
      });
    }
  }

  // 2. Seed Users (link to Department)
  if (data.users) {
    for (const u of data.users) {
      let deptId = null;
      if (u.department) {
        const dept = await prisma.department.findUnique({ where: { name: u.department } });
        if (dept) deptId = dept.id;
      }
      
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role as UserRole,
          departmentId: deptId
        },
        create: {
          email: u.email,
          name: u.name,
          passwordHash: await bcrypt.hash('password123', 10),
          role: u.role as UserRole,
          departmentId: deptId
        }
      });
    }
  }

  // 3. Update Departments with head and parent
  if (data.departments) {
    for (const d of data.departments) {
      let parentId = null;
      if (d.parentName) {
        const parent = await prisma.department.findUnique({ where: { name: d.parentName } });
        if (parent) parentId = parent.id;
      }
      let headId = null;
      if (d.headEmail) {
        const head = await prisma.user.findUnique({ where: { email: d.headEmail } });
        if (head) headId = head.id;
      }
      
      if (parentId || headId) {
        await prisma.department.update({
          where: { name: d.name },
          data: { parentId, headId }
        });
      }
    }
  }
}

async function seedAssets() {
  const assetsPath = path.join(__dirname, 'seed-data', 'assets.json');
  if (!fs.existsSync(assetsPath)) {
    console.log('Skipping assets.json (not found).');
    return;
  }
  console.log('Seeding assets.json...');
  const data = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));

  if (data.assets) {
    // 1. Extract and seed unique categories
    const categoryNames = [...new Set(data.assets.map((a: any) => a.category))];
    for (const catName of categoryNames) {
      if (!catName) continue;
      await prisma.assetCategory.upsert({
        where: { name: String(catName) },
        update: {},
        create: {
          name: String(catName),
          description: String(catName) + ' Category',
          icon: 'box'
        }
      });
    }

    // 2. Seed Assets
    for (const a of data.assets) {
      // Find Category
      const cat = await prisma.assetCategory.findUnique({ where: { name: a.category } });
      if (!cat) continue; // skip if category doesn't exist for some reason
      
      // Find Department
      let deptId = null;
      if (a.department) {
        const dept = await prisma.department.findUnique({ where: { name: a.department } });
        if (dept) deptId = dept.id;
      }

      // Find a user to be the creator
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) throw new Error("Cannot seed assets without at least one user in DB.");

      await prisma.asset.upsert({
        where: { assetTag: a.assetTag },
        update: {
          name: a.name,
          categoryId: cat.id,
          status: (a.status || 'AVAILABLE') as AssetStatus,
          condition: (a.condition || 'GOOD') as AssetCondition,
          location: a.location || null,
          isBookable: a.isBookable ?? true,
          acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate) : null,
          acquisitionCost: a.acquisitionCost || null,
          departmentId: deptId,
          customFieldValues: a.customFieldValues || {}
        },
        create: {
          assetTag: a.assetTag,
          name: a.name,
          categoryId: cat.id,
          serialNumber: a.serialNumber || null,
          status: (a.status || 'AVAILABLE') as AssetStatus,
          condition: (a.condition || 'GOOD') as AssetCondition,
          location: a.location || null,
          isBookable: a.isBookable ?? true,
          createdById: firstUser.id,
          acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate) : null,
          acquisitionCost: a.acquisitionCost || null,
          departmentId: deptId,
          customFieldValues: a.customFieldValues || {}
        }
      });
    }
  }
}

async function seedAllocationsAndBookings() {
  const allocPath = path.join(__dirname, 'seed-data', 'allocations-bookings.json');
  if (!fs.existsSync(allocPath)) {
    console.log('Skipping allocations-bookings.json (not found).');
    return;
  }
  console.log('Seeding allocations-bookings.json...');
  const data = JSON.parse(fs.readFileSync(allocPath, 'utf8'));

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No ADMIN user found for allocation creation.');

  if (data.allocations) {
    for (const alloc of data.allocations) {
      const asset = await prisma.asset.findUnique({ where: { assetTag: alloc.assetTag } });
      if (!asset) continue;

      // Idempotency: one ACTIVE allocation per asset is enforced by a partial
      // unique index; skip if this asset already holds an active allocation.
      if ((alloc.status || 'ACTIVE') === 'ACTIVE') {
        const existing = await prisma.allocation.findFirst({
          where: { assetId: asset.id, status: 'ACTIVE' },
        });
        if (existing) continue;
      }

      let holderUserId = null;
      let holderDepartmentId = null;

      if (alloc.holderEmail) {
        const user = await prisma.user.findUnique({ where: { email: alloc.holderEmail } });
        if (user) holderUserId = user.id;
      } else if (alloc.holderDepartment) {
        const dept = await prisma.department.findUnique({ where: { name: alloc.holderDepartment } });
        if (dept) holderDepartmentId = dept.id;
      }

      await prisma.allocation.create({
        data: {
          assetId: asset.id,
          holderUserId,
          holderDepartmentId,
          allocatedById: admin.id,
          allocatedAt: new Date(alloc.allocatedAt),
          expectedReturnAt: alloc.expectedReturnAt ? new Date(alloc.expectedReturnAt) : null,
          status: alloc.status || 'ACTIVE',
          notes: alloc.notes,
        }
      });
      
      if (alloc.status === 'ACTIVE') {
         await prisma.asset.update({ where: { id: asset.id }, data: { status: 'ALLOCATED' } });
      }
    }
  }

  if (data.bookings) {
    for (const b of data.bookings) {
      const asset = await prisma.asset.findUnique({ where: { assetTag: b.assetTag } });
      const user = await prisma.user.findUnique({ where: { email: b.bookedByEmail } });
      if (!asset || !user) continue;

      // Idempotency: skip if an identical booking window already exists.
      const existingBooking = await prisma.booking.findFirst({
        where: { assetId: asset.id, startAt: new Date(b.startAt) },
      });
      if (existingBooking) continue;

      await prisma.booking.create({
        data: {
          assetId: asset.id,
          bookedById: user.id,
          purpose: b.purpose,
          startAt: new Date(b.startAt),
          endAt: new Date(b.endAt),
          status: b.status || 'CONFIRMED'
        }
      });
    }
  }
}

async function seedMaintenance() {
  const maintPath = path.join(__dirname, 'seed-data', 'maintenance.json');
  if (!fs.existsSync(maintPath)) {
    console.log('Skipping maintenance.json (not found).');
    return;
  }
  console.log('Seeding maintenance.json...');
  const data = JSON.parse(fs.readFileSync(maintPath, 'utf8'));

  const decider = await prisma.user.findFirst({
    where: { role: 'ASSET_MANAGER' },
  });

  if (data.maintenanceRequests) {
    for (const m of data.maintenanceRequests) {
      const asset = await prisma.asset.findUnique({
        where: { assetTag: m.assetTag },
      });
      const raiser = await prisma.user.findUnique({
        where: { email: m.raisedByEmail },
      });
      if (!asset || !raiser) continue;

      // Idempotency: skip if this asset already has a request with this title.
      const existing = await prisma.maintenanceRequest.findFirst({
        where: { assetId: asset.id, title: m.title },
      });
      if (existing) continue;

      // Populate decision/execution fields consistent with the status.
      const decided = ['APPROVED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(m.status);
      const started = ['IN_PROGRESS', 'RESOLVED'].includes(m.status);
      const created = m.createdAt ? new Date(m.createdAt) : new Date();

      await prisma.maintenanceRequest.create({
        data: {
          assetId: asset.id,
          raisedById: raiser.id,
          title: m.title,
          description: m.description ?? null,
          priority: m.priority || 'MEDIUM',
          status: m.status || 'PENDING',
          decidedById: decided && decider ? decider.id : null,
          decidedAt: decided ? created : null,
          rejectionReason: m.rejectionReason ?? null,
          technicianName: m.technicianName ?? null,
          assignedAt: m.technicianName ? created : null,
          startedAt: started ? created : null,
          resolvedAt: m.status === 'RESOLVED' ? created : null,
          resolutionNotes: m.resolutionNotes ?? null,
          cost: m.cost ?? null,
          createdAt: created,
        },
      });

      // Keep asset status consistent with an approved-but-unresolved request.
      if (m.status === 'APPROVED' || m.status === 'ASSIGNED' || m.status === 'IN_PROGRESS') {
        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'UNDER_MAINTENANCE' },
        });
      }
    }
  }
}

async function main() {
  console.log('Starting seed process...');
  await seedOrganization();
  await seedAssets();
  await seedAllocationsAndBookings();
  await seedMaintenance();
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
