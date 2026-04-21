import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { CheckInClient } from './CheckInClient'

export const dynamic = 'force-dynamic'

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ quarterId?: string; teamId?: string }>
}) {
  const sp = await searchParams
  const [quarters, teams, session] = await Promise.all([
    prisma.quarter.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    getSession(),
  ])

  const activeQuarter =
    quarters.find((q) => q.id === sp.quarterId) ||
    quarters.find((q) => q.status === 'active') ||
    quarters[0]

  const activeTeam = teams.find((t) => t.id === sp.teamId) ?? null

  const objectives =
    activeQuarter && activeTeam
      ? await prisma.objective.findMany({
          where: {
            quarterId: activeQuarter.id,
            teamId: activeTeam.id,
            status: 'active',
          },
          include: {
            keyResults: {
              include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : []

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return (
    <CheckInClient
      quarters={quarters}
      teams={teams}
      objectives={objectives}
      activeQuarter={activeQuarter ?? null}
      activeTeam={activeTeam}
      role={role}
    />
  )
}
