import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarterId?: string }>
}) {
  const sp = await searchParams
  const [quarters, session] = await Promise.all([
    prisma.quarter.findMany({ orderBy: { startDate: 'desc' } }),
    getSession(),
  ])
  const activeQuarter =
    quarters.find((q) => q.id === sp.quarterId) ||
    quarters.find((q) => q.status === 'active') ||
    quarters[0]

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  if (!activeQuarter) {
    const isAdmin = role === 'admin'
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Waypoint</h2>
        <p className="text-gray-500 mb-6">
          {isAdmin
            ? 'Get started by creating a quarter and adding your objectives.'
            : 'No quarters have been set up yet. Please contact an administrator.'}
        </p>
        {isAdmin && (
          <div className="flex gap-3 justify-center">
            <Link
              href="/quarters"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Create a Quarter
            </Link>
          </div>
        )}
      </div>
    )
  }

  const objectives = await prisma.objective.findMany({
    where: { quarterId: activeQuarter.id },
    include: {
      team: true,
      tags: { include: { tag: true } },
      parent: { select: { id: true, title: true } },
      children: {
        include: {
          team: true,
          tags: { include: { tag: true } },
          keyResults: {
            include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
          },
        },
      },
      keyResults: {
        include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <DashboardClient
      quarters={quarters}
      activeQuarter={activeQuarter}
      objectives={objectives}
      role={role}
    />
  )
}
