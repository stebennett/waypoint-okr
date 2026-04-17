import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const PUT = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("okr_manager")
  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.finalScore !== undefined) data.finalScore = body.finalScore !== null ? Number(body.finalScore) : null
  if (body.closeNote !== undefined) data.closeNote = body.closeNote || null

  const keyResult = await prisma.keyResult.update({
    where: { id },
    data,
    include: {
      checkIns: { orderBy: { createdAt: "desc" } },
    },
  })
  return NextResponse.json(keyResult)
})

export const DELETE = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("okr_manager")
  const { id } = await params
  await prisma.keyResult.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
