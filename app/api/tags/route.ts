import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async () => {
  await requireAuth()
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { objectives: true } } },
  })
  return NextResponse.json(tags)
})

export const POST = withErrorHandling(async (request: Request) => {
  await requireRole("admin")
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Tag name is required" }, { status: 400 })

  const tag = await prisma.tag.create({
    data: {
      name: body.name.trim(),
      color: body.color || "#6366f1",
    },
  })
  return NextResponse.json(tag, { status: 201 })
})
