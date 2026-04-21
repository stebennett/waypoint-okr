import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const schema = z.object({ password: z.string().min(8).max(200) })

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireRole("admin")
    const { id } = await ctx.params
    const { password } = schema.parse(await req.json())
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    })
    // Invalidate existing sessions for the affected user
    await prisma.session.deleteMany({ where: { userId: id } })
    return NextResponse.json({ ok: true })
  }
)
