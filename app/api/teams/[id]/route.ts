import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth()
  const { id } = await params
  const team = await prisma.team.findUnique({
    where: { id },
    include: { _count: { select: { objectives: true } } },
  })
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 })
  return NextResponse.json(team)
})

export const PUT = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin")
  const { id } = await params
  const body = await request.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 })
  }
  const team = await prisma.team.update({
    where: { id },
    data: { name: body.name.trim() },
  })
  return NextResponse.json(team)
})

export const DELETE = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin")
  const { id } = await params
  await prisma.team.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
