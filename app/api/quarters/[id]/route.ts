import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth()
  const { id } = await params
  const quarter = await prisma.quarter.findUnique({
    where: { id },
    include: {
      objectives: {
        include: {
          team: true,
          tags: { include: { tag: true } },
          keyResults: {
            include: {
              checkIns: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
          children: {
            include: {
              team: true,
              keyResults: {
                include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } },
              },
            },
          },
        },
      },
    },
  })
  if (!quarter) return NextResponse.json({ error: "Quarter not found" }, { status: 404 })
  return NextResponse.json(quarter)
})

export const PUT = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin")
  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate)
  if (body.status !== undefined) data.status = body.status

  const quarter = await prisma.quarter.update({
    where: { id },
    data,
  })
  return NextResponse.json(quarter)
})
