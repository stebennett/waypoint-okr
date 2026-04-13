import { prisma } from '@/lib/prisma'
import { TeamsClient } from './TeamsClient'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { objectives: true } } },
  })

  return <TeamsClient initialTeams={teams} />
}
