import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth()
  const { id } = await params
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      objectives: {
        include: {
          objective: {
            include: {
              team: true,
              quarter: true,
              keyResults: {
                include: { checkIns: { orderBy: { createdAt: "desc" }, take: 1 } },
              },
            },
          },
        },
      },
    },
  })
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  return NextResponse.json(tag)
})

export const DELETE = withErrorHandling(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin")
  const { id } = await params
  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
