import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth()
  const body = schema.parse(await req.json())
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
  if (!user.passwordHash) throw new HttpError(400, "This account has no password set")
  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash)
  if (!ok) throw new HttpError(400, "Current password is incorrect")
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 12) },
  })
  return NextResponse.json({ ok: true })
})
