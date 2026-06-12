export const ROLES = {
  USER: 'USER',
  TEAM_ADMIN: 'TEAM_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
