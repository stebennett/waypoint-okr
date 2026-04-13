import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ObjectiveDetailClient } from './ObjectiveDetailClient'

export const dynamic = 'force-dynamic'

export default async function ObjectiveDetailPage({ params }: { params: { id: string } }) {
  const objective = await prisma.objective.findUnique({
    where: { id: params.id },
    include: {
      team: true,
      quarter: true,
      tags: { include: { tag: true } },
      parent: { select: { id: true, title: true, level: true } },
      children: {
        include: {
          team: true,
          keyResults: {
            include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
          },
        },
      },
      keyResults: {
        include: {
          checkIns: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!objective) notFound()

  return <ObjectiveDetailClient objective={objective} />
}
