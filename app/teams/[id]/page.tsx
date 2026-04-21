import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { TeamDetailClient } from './TeamDetailClient'

export const dynamic = 'force-dynamic'

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ quarterId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const [team, quarters, session] = await Promise.all([
    prisma.team.findUnique({ where: { id } }),
    prisma.quarter.findMany({ orderBy: { startDate: 'desc' } }),
    getSession(),
  ])
  if (!team) notFound()

  const activeQuarter =
    quarters.find((q) => q.id === sp.quarterId) ||
    quarters.find((q) => q.status === 'active') ||
    quarters[0]

  const objectives = activeQuarter
    ? await prisma.objective.findMany({
        where: { teamId: id, quarterId: activeQuarter.id },
        include: {
          tags: { include: { tag: true } },
          keyResults: {
            include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 3 } },
            orderBy: { createdAt: 'asc' },
          },
          parent: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return (
    <TeamDetailClient
      team={team}
      quarters={quarters}
      activeQuarter={activeQuarter ?? null}
      objectives={objectives}
      role={role}
    />
  )
}
