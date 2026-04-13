import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { QuarterDetailClient } from './QuarterDetailClient'

export const dynamic = 'force-dynamic'

export default async function QuarterDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { teamId?: string; tagId?: string }
}) {
  const quarter = await prisma.quarter.findUnique({ where: { id: params.id } })
  if (!quarter) notFound()

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })

  const where: Record<string, unknown> = { quarterId: params.id }
  if (searchParams.teamId) where.teamId = searchParams.teamId
  if (searchParams.tagId) where.tags = { some: { tagId: searchParams.tagId } }

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

  return (
    <QuarterDetailClient
      quarter={quarter}
      objectives={objectives}
      teams={teams}
      tags={tags}
      selectedTeamId={searchParams.teamId ?? null}
      selectedTagId={searchParams.tagId ?? null}
    />
  )
}
