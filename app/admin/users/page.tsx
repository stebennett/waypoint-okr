import Link from "next/link"
import { prisma } from "@/lib/prisma"
import UsersTable from "./UsersTable"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
  })
  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastSessionExpires: u.sessions[0]?.expires.toISOString() ?? null,
  }))
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link href="/admin/users/new" className="bg-indigo-600 text-white px-3 py-1 rounded">New user</Link>
      </div>
      <UsersTable rows={rows} />
    </div>
  )
}
