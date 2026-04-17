import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const updateSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  role: z.enum(["viewer", "okr_manager", "admin"]).optional(),
})

async function assertNotLastAdminChange(targetId: string, newRole?: string) {
  if (newRole === "admin") return
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } })
  if (!target || target.role !== "admin") return
  const adminCount = await prisma.user.count({ where: { role: "admin" } })
  if (adminCount <= 1) {
    throw new HttpError(400, "Cannot remove or demote the last admin")
  }
}

export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireRole("admin")
    const { id } = await ctx.params
    const body = updateSchema.parse(await req.json())

    if (session.user.id === id && body.role && body.role !== "admin") {
      throw new HttpError(400, "You cannot demote yourself")
    }
    if (body.role) await assertNotLastAdminChange(id, body.role)

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
      select: { id: true, email: true, name: true, role: true },
    })
    return NextResponse.json(updated)
  }
)

export const DELETE = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireRole("admin")
    const { id } = await ctx.params
    if (session.user.id === id) throw new HttpError(400, "You cannot delete yourself")
    await assertNotLastAdminChange(id)
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
)
