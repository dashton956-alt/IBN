export type Role = 'admin' | 'operator' | 'viewer';

export function hasPermission(role: Role, action: string): boolean {
  const permissions: Record<Role, string[]> = {
    admin: ['create', 'approve', 'deploy', 'rollback', 'view', 'schedule', 'bulk'],
    operator: ['create', 'deploy', 'view', 'schedule', 'bulk'],
    viewer: ['view'],
  };
  return permissions[role]?.includes(action);
}

// Usage example:
// if (!hasPermission(userRole, 'approve')) { /* show error or hide button */ }
