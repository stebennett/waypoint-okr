import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"
import { recordChange } from "@/lib/audit"

export const PUT = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("okr_manager")
  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.finalScore !== undefined) data.finalScore = body.finalScore !== null ? Number(body.finalScore) : null
  if (body.closeNote !== undefined) data.closeNote = body.closeNote || null

  const keyResult = await prisma.$transaction(async (tx) => {
    const before = await tx.keyResult.findUniqueOrThrow({ where: { id } })
    const after = await tx.keyResult.update({
      where: { id },
      data,
      include: {
        checkIns: { orderBy: { createdAt: "desc" } },
      },
    })
    await recordChange(tx, {
      entityType: "KeyResult",
      entityId: id,
      userId: session.user.id,
      action: "update",
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    })
    return after
  })
  return NextResponse.json(keyResult)
})

export const DELETE = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("okr_manager")
  const { id } = await params
  await prisma.$transaction(async (tx) => {
    const before = await tx.keyResult.findUniqueOrThrow({ where: { id } })
    await tx.keyResult.delete({ where: { id } })
    await recordChange(tx, {
      entityType: "KeyResult",
      entityId: id,
      userId: session.user.id,
      action: "delete",
      before: before as unknown as Record<string, unknown>,
    })
  })
  return NextResponse.json({ success: true })
})
