import { UserRole, Permission } from './roles';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        permissions: Permission[];
        sessionId?: string;
      };
      idempotencyKey?: string;
    }
  }
}

export {};
