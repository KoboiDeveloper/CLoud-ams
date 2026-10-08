import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { id: 'SUPER', nama: 'Super Admin' },
    { id: 'ADMIN', nama: 'Admin' },
    { id: 'STAFF', nama: 'Staff' },
  ];

  for (const role of roles) {
    await prisma.dT_ROLE.upsert({
      where: { id: role.id },
      create: role,
      update: { nama: role.nama },
    });
  }

  const rawNik = process.env.ADMIN_NIK || '14118309';
  const nik = rawNik.slice(0, 8).padStart(8, '0');
  const password = bcrypt.hashSync(
    process.env.ADMIN_PASSWORD || 'Penyok_1678',
    bcrypt.genSaltSync(),
  );
  const quota = BigInt(process.env.DEFAULT_QUOTA_BYTES || '5368709120');
  const noTelp = (process.env.ADMIN_NO_TELP || '').slice(0, 13) || null;
  const email = (process.env.ADMIN_EMAIL || '').slice(0, 100) || null;

  await prisma.dT_USER.upsert({
    where: { nik },
    create: {
      nik,
      nama: (process.env.ADMIN_NAMA || 'Super Admin').slice(0, 40),
      password,
      noTelp,
      email,
      roleId: 'SUPER',
      statusActive: true,
      handleWeb: true,
    },
    update: {
      nama: (process.env.ADMIN_NAMA || 'Super Admin').slice(0, 40),
      password,
      roleId: 'SUPER',
      statusActive: true,
    },
  });

  await prisma.dT_USER_QUOTA.upsert({
    where: { nik },
    create: { nik, limitBytes: quota, usedBytes: BigInt(0) },
    update: {},
  });

  console.log(`Seeded SUPER user ${nik}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
