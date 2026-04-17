import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("okr_manager")
  const { id } = await params
  const body = await request.json()
  const { closeNote, keyResults } = body

  // Update KR final scores if provided
  if (keyResults && Array.isArray(keyResults)) {
    for (const kr of keyResults) {
      await prisma.keyResult.update({
        where: { id: kr.id },
        data: {
          finalScore: kr.finalScore !== undefined ? Number(kr.finalScore) : undefined,
          closeNote: kr.closeNote || null,
        },
      })
    }
  }

  const objective = await prisma.objective.update({
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
  return NextResponse.json(objective)
})
