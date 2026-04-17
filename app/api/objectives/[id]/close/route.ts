import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"
import { recordChange } from "@/lib/audit"

export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("okr_manager")
  const { id } = await params
  const body = await request.json()
  const { closeNote, keyResults } = body

  const objective = await prisma.$transaction(async (tx) => {
    const before = await tx.objective.findUniqueOrThrow({ where: { id } })

    // Update KR final scores if provided
    if (keyResults && Array.isArray(keyResults)) {
      for (const kr of keyResults) {
        await tx.keyResult.update({
          where: { id: kr.id },
          data: {
            finalScore: kr.finalScore !== undefined ? Number(kr.finalScore) : undefined,
            closeNote: kr.closeNote || null,
          },
        })
      }
    }

    const after = await tx.objective.update({
      where: { id },
      data: {
        status: "closed",
        closeNote: closeNote || null,
        closedAt: new Date(),
      },
      include: {
        team: true,
        quarter: true,
        tags: { include: { tag: true } },
        keyResults: {
          include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    })

    await recordChange(tx, {
      entityType: "Objective",
      entityId: id,
      userId: session.user.id,
      action: "update",
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    })

    return after
  })

  return NextResponse.json(objective)
})
