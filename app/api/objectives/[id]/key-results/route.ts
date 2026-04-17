import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth()
  const { id } = await params
  const keyResults = await prisma.keyResult.findMany({
    where: { objectiveId: id },
    include: {
      checkIns: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(keyResults)
})

export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("okr_manager")
  const { id } = await params
  const body = await request.json()
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Key result title is required" }, { status: 400 })
  }

  const keyResult = await prisma.keyResult.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      objectiveId: id,
      createdById: session.user.id,
    },
    include: {
      checkIns: { orderBy: { createdAt: "desc" } },
    },
  })
  return NextResponse.json(keyResult, { status: 201 })
})
