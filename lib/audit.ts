import type { Prisma, PrismaClient } from "@prisma/client"

type EntityType = "Objective" | "KeyResult"
type Action = "create" | "update" | "delete"

type PrismaTx = Prisma.TransactionClient | PrismaClient

export const TRACKED_FIELDS: Record<EntityType, string[]> = {
  Objective: [
    "title",
    "description",
    "status",
    "level",
    "quarterId",
    "teamId",
    "parentId",
    "closeNote",
  ],
  KeyResult: ["title", "description", "finalScore", "closeNote"],
}

function pick(obj: Record<string, unknown> | null, fields: string[]) {
  if (!obj) return {}
  const out: Record<string, unknown> = {}
  for (const f of fields) out[f] = obj[f] ?? null
  return out
}

export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  for (const f of fields) {
    const a = before[f] ?? null
    const b = after[f] ?? null
    if (a !== b) diff[f] = { from: a, to: b }
  }
  return diff
}

export async function recordChange(
  tx: PrismaTx,
  args: {
    entityType: EntityType
    entityId: string
    userId: string | null
    action: Action
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
  }
) {
  const fields = TRACKED_FIELDS[args.entityType]
  let changes: unknown
  if (args.action === "update") {
    const diff = computeDiff(
      pick(args.before ?? null, fields),
      pick(args.after ?? null, fields),
      fields
    )
    if (Object.keys(diff).length === 0) return // no-op
    changes = diff
  } else if (args.action === "create") {
    changes = pick(args.after ?? null, fields)
  } else {
    changes = pick(args.before ?? null, fields)
  }
  await tx.auditLog.create({
    data: {
      entityType: args.entityType,
      entityId: args.entityId,
      userId: args.userId,
      action: args.action,
      changes: JSON.stringify(changes),
    },
  })
}
