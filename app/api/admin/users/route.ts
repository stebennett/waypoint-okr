import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(200),
  role: z.enum(["viewer", "okr_manager", "admin"]),
})

export const GET = withErrorHandling(async () => {
  await requireRole("admin")
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return NextResponse.json(users)
})

export const POST = withErrorHandling(async (req: Request) => {
  await requireRole("admin")
  const body = createSchema.parse(await req.json())
  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) throw new HttpError(409, "A user with that email already exists")
  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name ?? null,
      role: body.role,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
})
