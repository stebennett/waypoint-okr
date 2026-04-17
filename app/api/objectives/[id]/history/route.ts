import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAuth()
    const { id } = await ctx.params
    const krIds = (
      await prisma.keyResult.findMany({ where: { objectiveId: id }, select: { id: true } })
    ).map((k) => k.id)

    const rows = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Objective", entityId: id },
          { entityType: "KeyResult", entityId: { in: krIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        changes: JSON.parse(r.changes),
        createdAt: r.createdAt,
        user: r.user,
      }))
    )
  }
)
