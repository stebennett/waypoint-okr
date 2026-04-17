import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (request: Request) => {
  await requireAuth()
  const { searchParams } = new URL(request.url)
  const quarterId = searchParams.get("quarterId")
  const teamId = searchParams.get("teamId")
  const level = searchParams.get("level")
  const tagId = searchParams.get("tagId")

  const where: Record<string, unknown> = {}
  if (quarterId) where.quarterId = quarterId
  if (teamId) where.teamId = teamId
  if (level) where.level = level
  if (tagId) where.tags = { some: { tagId } }

  const objectives = await prisma.objective.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      team: true,
      quarter: true,
      tags: { include: { tag: true } },
      parent: { select: { id: true, title: true } },
      children: {
        include: {
          team: true,
          keyResults: {
            include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
        },
      },
      keyResults: {
        include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  })
  return NextResponse.json(objectives)
})

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireRole("okr_manager")
  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (!body.quarterId) return NextResponse.json({ error: "Quarter is required" }, { status: 400 })
  if (body.level === "team" && !body.teamId) {
    return NextResponse.json({ error: "Team is required for team-level objectives" }, { status: 400 })
  }

  const objective = await prisma.objective.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      level: body.level || "team",
      quarterId: body.quarterId,
      teamId: body.teamId || null,
      parentId: body.parentId || null,
      createdById: session.user.id,
      tags: body.tagIds?.length
        ? { create: body.tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
    },
    include: {
      team: true,
      quarter: true,
      tags: { include: { tag: true } },
      parent: { select: { id: true, title: true } },
      keyResults: true,
    },
  })
  return NextResponse.json(objective, { status: 201 })
})
