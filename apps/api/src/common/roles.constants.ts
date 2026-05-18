export const ADMIN_ROLES = [
  'admin',
  'principal',
  'vice_principal',
  'vice_principal_academic',
] as const;

export const STAFF_ROLES = [
  'admin',
  'principal',
  'vice_principal',
  'vice_principal_academic',
  'vice_principal_education',
  'psychologist',
  'social_pedagogue',
] as const;

export const ALL_TEACHER_ROLES = [
  'teacher',
  'class_teacher',
] as const;

export const isAdminRole = (role: string): boolean =>
  (ADMIN_ROLES as readonly string[]).includes(role);

export const isStaffRole = (role: string): boolean =>
  (STAFF_ROLES as readonly string[]).includes(role);
