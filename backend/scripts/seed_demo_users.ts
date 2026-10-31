import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB, disconnectDB } from '../src/config/database';
import { User } from '../src/models/User';
import { UserRole } from '../src/types/roles';
import { hashPassword } from '../src/utils/crypto';
import { logger } from '../src/config/logger';

const demoUsers = [
  {
    name: 'Ahmed Noor (Super Admin)',
    email: 'admin@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.ADMIN,
    phone: '+252 61 5111111'
  },
  {
    name: 'Fadumo Warsame',
    email: 'fadumo.mgr@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.MANAGER,
    phone: '+252 61 5222222'
  },
  {
    name: 'Hassan Ali',
    email: 'hassan.cashier@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.CASHIER,
    phone: '+252 61 5333333'
  },
  {
    name: 'Khadija Osman',
    email: 'khadija.inv@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.INVENTORY_MANAGER,
    phone: '+252 61 5444444'
  },
  {
    name: 'Mohamed Jama',
    email: 'jama.acc@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.ACCOUNTANT,
    phone: '+252 61 5555555'
  },
  {
    name: 'Sahra Abdi',
    email: 'sahra.audit@supermarket.so',
    password: 'Supermarket@2026',
    role: UserRole.AUDITOR,
    phone: '+252 61 5666666'
  }
];

async function seedDemoUsers() {
  try {
    await connectDB();
    for (const u of demoUsers) {
      const passwordHash = await hashPassword(u.password);
      await User.findOneAndUpdate(
        { email: u.email },
        {
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          phone: u.phone,
          status: 'active'
        },
        { upsert: true, new: true }
      );
      logger.info(`✅ Seeded demo user: ${u.email} (${u.role})`);
    }
    logger.info('🎉 All demo users successfully seeded into MongoDB!');
    await disconnectDB();
    process.exit(0);
  } catch (err: any) {
    logger.error('Failed to seed demo users: ' + err.message);
    process.exit(1);
  }
}

seedDemoUsers();
