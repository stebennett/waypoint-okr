import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { ObjectiveDetailClient } from './ObjectiveDetailClient'

export const dynamic = 'force-dynamic'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [objective, session] = await Promise.all([
    prisma.objective.findUnique({
      where: { id },
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
    }),
    getSession(),
  ])

  if (!objective) notFound()

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return <ObjectiveDetailClient objective={objective} role={role} />
}
