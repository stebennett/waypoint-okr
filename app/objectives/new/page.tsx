import { prisma } from '@/lib/prisma'
import { NewObjectiveClient } from './NewObjectiveClient'

export const dynamic = 'force-dynamic'

export default async function NewObjectivePage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; quarterId?: string }>
}) {
  const sp = await searchParams
  const [teams, quarters, tags] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.quarter.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ])

  const activeQuarter = quarters.find((q) => q.status === 'active') ?? quarters[0] ?? null

  // For alignment: company objectives
  const companyObjectives = await prisma.objective.findMany({
    where: { level: 'company' },
    include: { quarter: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <NewObjectiveClient
      teams={teams}
      quarters={quarters}
      tags={tags}
      companyObjectives={companyObjectives}
      defaultTeamId={sp.teamId ?? null}
      defaultQuarterId={sp.quarterId ?? activeQuarter?.id ?? null}
    />
  )
}
