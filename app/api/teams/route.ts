import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async () => {
  await requireAuth()
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { objectives: true } } },
  })
  return NextResponse.json(teams)
})

export const POST = withErrorHandling(async (request: Request) => {
  await requireRole("admin")
  const body = await request.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 })
  }
  const team = await prisma.team.create({
    data: { name: body.name.trim() },
  })
  return NextResponse.json(team, { status: 201 })
})
