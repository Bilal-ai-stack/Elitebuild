// =============================================================================
// ELITEBUILD — RBAC & Permission Definitions
// Pure authorization functions independent of HTTP headers or cookies
// =============================================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'

export function canManageUsers(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

export function canManageContent(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(role)
}

export function canManageDocuments(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role)
}

export function canViewAuditLogs(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}
