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
  params: Promise<{ id: string }>
  searchParams: Promise<{ teamId?: string; tagId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const quarter = await prisma.quarter.findUnique({ where: { id } })
  if (!quarter) notFound()

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })

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

  return (
    <QuarterDetailClient
      quarter={quarter}
      objectives={objectives}
      teams={teams}
      tags={tags}
      selectedTeamId={sp.teamId ?? null}
      selectedTagId={sp.tagId ?? null}
    />
  )
}
