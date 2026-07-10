export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin',
  GLOBAL_ADMIN: 'global_admin',
  SYSTEM_ADMIN: 'system_admin',
  HR_MANAGER: 'hr_manager',
};

// These four roles all get "admin-tier" access by default. 'admin' is kept
// as a permanent alias so anything relying on the original role keeps working.
export const ADMIN_TIER_ROLES = [ROLES.ADMIN, ROLES.GLOBAL_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.HR_MANAGER];

export function isAdminTier(role) {
  return ADMIN_TIER_ROLES.includes(role);
}

export function roleLabel(role) {
  return (
    {
      employee: 'Employee',
      manager: 'Manager',
      admin: 'Admin',
      global_admin: 'Global Admin',
      system_admin: 'System Admin',
      hr_manager: 'HR Manager',
    }[role] || role
  );
}
