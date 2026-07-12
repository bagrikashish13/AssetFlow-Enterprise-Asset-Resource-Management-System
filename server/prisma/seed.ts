import { PrismaClient, UserRole, AssetStatus, AssetCondition } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedOrganization() {
  const orgPath = path.join(__dirname, 'seed-data', 'organization.json');
  if (!fs.existsSync(orgPath)) {
    console.log('Skipping organization seed: organization.json not found (P2 has not merged yet).');
    return;
  }

  console.log('Seeding organization data...');
  const orgData = JSON.parse(fs.readFileSync(orgPath, 'utf-8'));

  // 1. Upsert Departments
  if (orgData.departments) {
    for (const dept of orgData.departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        update: { description: dept.description },
        create: {
          name: dept.name,
          description: dept.description,
        },
      });
    }

    // Second pass for parent/child
    for (const dept of orgData.departments) {
      if (dept.parentName) {
        const parent = await prisma.department.findUnique({ where: { name: dept.parentName } });
        if (parent) {
          await prisma.department.update({
            where: { name: dept.name },
            data: { parentId: parent.id },
          });
        }
      }
    }
  }

  // 2. Upsert Categories
  if (orgData.categories) {
    for (const cat of orgData.categories) {
      await prisma.assetCategory.upsert({
        where: { name: cat.name },
        update: {
          description: cat.description,
          icon: cat.icon,
          fields: cat.fields || [],
        },
        create: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          fields: cat.fields || [],
        },
      });
    }
  }

  // 3. Upsert Users
  if (orgData.users) {
    const passwordHash = await bcrypt.hash('password123', 10);
    for (const user of orgData.users) {
      let departmentId = null;
      if (user.department) {
        const dept = await prisma.department.findUnique({ where: { name: user.department } });
        departmentId = dept?.id || null;
      }

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role as UserRole,
          departmentId,
        },
        create: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role as UserRole,
          departmentId,
        },
      });
    }

    // Assign Department Heads
    for (const dept of orgData.departments) {
      if (dept.headEmail) {
        const head = await prisma.user.findUnique({ where: { email: dept.headEmail } });
        if (head) {
          await prisma.department.update({
            where: { name: dept.name },
            data: { headId: head.id },
          });
        }
      }
    }
  }
}

async function seedAssets() {
  const assetsPath = path.join(__dirname, 'seed-data', 'assets.json');
  if (!fs.existsSync(assetsPath)) {
    console.log('Skipping assets seed: assets.json not found (P3 has not merged yet).');
    return;
  }

  console.log('Seeding assets data...');
  const assetsData = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));

  if (assetsData.assets) {
    // Need an admin user to be the creator
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      console.warn('Cannot seed assets: No ADMIN user found to set as createdBy.');
      return;
    }

    for (const asset of assetsData.assets) {
      const category = await prisma.assetCategory.findUnique({ where: { name: asset.category } });
      if (!category) {
        console.warn(`Category not found for asset ${asset.assetTag}: ${asset.category}`);
        continue;
      }

      let departmentId = null;
      if (asset.department) {
        const dept = await prisma.department.findUnique({ where: { name: asset.department } });
        departmentId = dept?.id || null;
      }

      await prisma.asset.upsert({
        where: { assetTag: asset.assetTag },
        update: {
          name: asset.name,
          categoryId: category.id,
          serialNumber: asset.serialNumber,
          acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate) : null,
          acquisitionCost: asset.acquisitionCost,
          condition: asset.condition as AssetCondition,
          location: asset.location,
          isBookable: asset.isBookable || false,
          status: asset.status as AssetStatus,
          departmentId,
          customFieldValues: asset.customFieldValues || {},
        },
        create: {
          assetTag: asset.assetTag,
          name: asset.name,
          categoryId: category.id,
          serialNumber: asset.serialNumber,
          acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate) : null,
          acquisitionCost: asset.acquisitionCost,
          condition: asset.condition as AssetCondition,
          location: asset.location,
          isBookable: asset.isBookable || false,
          status: asset.status as AssetStatus,
          departmentId,
          createdById: admin.id,
          customFieldValues: asset.customFieldValues || {},
        },
      });
    }
  }
}

async function main() {
  console.log('Starting seed...');
  await seedOrganization();
  await seedAssets();
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
