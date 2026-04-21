import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { TeamsClient } from './TeamsClient'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const [teams, session] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { objectives: true } } },
    }),
    getSession(),
  ])

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return <TeamsClient initialTeams={teams} role={role} />
}
