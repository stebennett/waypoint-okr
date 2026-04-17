import { prisma } from "@/lib/prisma"

export default async function AdminHome() {
  const [total, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ])
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>
      <p className="mb-2">Total users: {total}</p>
      <ul className="text-sm">
        {byRole.map((r) => (
          <li key={r.role}>{r.role}: {r._count._all}</li>
        ))}
      </ul>
    </div>
  )
}
