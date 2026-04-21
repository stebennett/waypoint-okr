import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { QuarterDetailClient } from './QuarterDetailClient'

export const dynamic = 'force-dynamic'

export default async function QuarterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ teamId?: string; tagId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const [quarter, teams, tags, session] = await Promise.all([
    prisma.quarter.findUnique({ where: { id } }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    getSession(),
  ])
  if (!quarter) notFound()

  const where: Record<string, unknown> = { quarterId: id }
  if (sp.teamId) where.teamId = sp.teamId
  if (sp.tagId) where.tags = { some: { tagId: sp.tagId } }

  const objectives = await prisma.objective.findMany({
    where,
    include: {
      team: true,
      tags: { include: { tag: true } },
      keyResults: {
        include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
  })

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return (
    <QuarterDetailClient
      quarter={quarter}
      objectives={objectives}
      teams={teams}
      tags={tags}
      selectedTeamId={sp.teamId ?? null}
      selectedTagId={sp.tagId ?? null}
      role={role}
    />
  )
}
