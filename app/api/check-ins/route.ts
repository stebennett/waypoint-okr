import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (request: Request) => {
  await requireAuth()
  const { searchParams } = new URL(request.url)
  const keyResultId = searchParams.get("keyResultId")
  const where = keyResultId ? { keyResultId } : {}
  const checkIns = await prisma.checkIn.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      keyResult: { select: { title: true, objectiveId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })
  return NextResponse.json(checkIns)
})

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireRole("okr_manager")
  const userId = session.user.id
  const body = await request.json()

  // Support batch check-ins: { checkIns: [...] }
  if (body.checkIns && Array.isArray(body.checkIns)) {
    const created = await prisma.$transaction(
      body.checkIns.map(
        (ci: { keyResultId: string; progress: number; confidence: number; notes?: string }) =>
          prisma.checkIn.create({
            data: {
              keyResultId: ci.keyResultId,
              progress: Math.min(100, Math.max(0, Number(ci.progress))),
              confidence: Math.min(100, Math.max(0, Number(ci.confidence))),
              notes: ci.notes?.trim() || null,
              userId,
            },
          })
      )
    )
    return NextResponse.json(created, { status: 201 })
  }

  if (!body.keyResultId) {
    return NextResponse.json({ error: "keyResultId is required" }, { status: 400 })
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      keyResultId: body.keyResultId,
      progress: Math.min(100, Math.max(0, Number(body.progress || 0))),
      confidence: Math.min(100, Math.max(0, Number(body.confidence || 0))),
      notes: body.notes?.trim() || null,
      userId,
    },
  })
  return NextResponse.json(checkIn, { status: 201 })
})
