import { z } from 'zod';
import { UserRole } from '../types/roles';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name is required').trim(),
  email: z.string().email('Valid email required').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_MANAGER,
    UserRole.CASHIER,
    UserRole.ACCOUNTANT,
    UserRole.AUDITOR
  ]),
  phone: z.string().trim().optional(),
  permissions: z.array(z.string()).optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  phone: z.string().trim().optional(),
  role: z
    .enum([
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.INVENTORY_MANAGER,
      UserRole.CASHIER,
      UserRole.ACCOUNTANT,
      UserRole.AUDITOR
    ])
    .optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended'])
});
