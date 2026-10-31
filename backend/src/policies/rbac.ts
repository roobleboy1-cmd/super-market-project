import { UserRole, Permission, RolePermissions } from '../types/roles';

export function hasPermission(
  role: UserRole,
  permission: Permission,
  customPermissions: string[] = []
): boolean {
  // Admins always have all permissions
  if (role === UserRole.ADMIN) {
    return true;
  }

  // Check explicit user overrides
  if (customPermissions.includes(permission)) {
    return true;
  }

  // Check baseline role permissions
  const rolePerms = RolePermissions[role] || [];
  return rolePerms.includes(permission);
}
