import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async () => {
  await requireAuth()
  const quarters = await prisma.quarter.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { objectives: true } } },
  })
  return NextResponse.json(quarters)
})

export const POST = withErrorHandling(async (request: Request) => {
  await requireRole("admin")
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Quarter name is required" }, { status: 400 })
  if (!body.startDate) return NextResponse.json({ error: "Start date is required" }, { status: 400 })
  if (!body.endDate) return NextResponse.json({ error: "End date is required" }, { status: 400 })

  const quarter = await prisma.quarter.create({
    data: {
      name: body.name.trim(),
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status || "active",
    },
  })
  return NextResponse.json(quarter, { status: 201 })
})
