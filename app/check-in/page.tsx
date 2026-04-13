import { prisma } from '@/lib/prisma'
import { CheckInClient } from './CheckInClient'

export const dynamic = 'force-dynamic'

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: { quarterId?: string; teamId?: string }
}) {
  const quarters = await prisma.quarter.findMany({ orderBy: { startDate: 'desc' } })
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  const activeQuarter =
    quarters.find((q) => q.id === searchParams.quarterId) ||
    quarters.find((q) => q.status === 'active') ||
    quarters[0]

  const activeTeam = teams.find((t) => t.id === searchParams.teamId) ?? null

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

  return (
    <CheckInClient
      quarters={quarters}
      teams={teams}
      objectives={objectives}
      activeQuarter={activeQuarter ?? null}
      activeTeam={activeTeam}
    />
  )
}
