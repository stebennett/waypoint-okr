import { auth } from "@/lib/auth/config"

export type Role = "viewer" | "okr_manager" | "admin"

export const ROLE_ORDER: Record<Role, number> = {
  viewer: 0,
  okr_manager: 1,
  admin: 2,
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function hasRole(
  userRole: Role | undefined | null,
  minRole: Role
): boolean {
  if (!userRole) return false
  return ROLE_ORDER[userRole] >= ROLE_ORDER[minRole]
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new HttpError(401, "Unauthorized")
  return session
}

export async function requireRole(minRole: Role) {
  const session = await requireAuth()
  if (!hasRole(session.user.role as Role, minRole)) {
    throw new HttpError(403, "Forbidden")
  }
  return session
}
