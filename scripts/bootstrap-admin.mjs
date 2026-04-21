import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

async function main() {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.user.count()
    if (count > 0) {
      console.log(`[bootstrap-admin] ${count} user(s) already exist; skipping.`)
      return
    }
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_INITIAL_PASSWORD
    if (!email || !password) {
      console.error(
        "[bootstrap-admin] ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set for first boot."
      )
      process.exit(1)
    }
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: "Admin",
        role: "admin",
        passwordHash: await bcrypt.hash(password, 12),
      },
    })
    console.log(`[bootstrap-admin] Created admin ${email}. CHANGE THIS PASSWORD ON FIRST LOGIN.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
