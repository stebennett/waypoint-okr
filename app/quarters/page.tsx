import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { QuartersClient } from './QuartersClient'

export const dynamic = 'force-dynamic'

export default async function QuartersPage() {
  const [quarters, session] = await Promise.all([
    prisma.quarter.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { objectives: true } } },
    }),
    getSession(),
  ])

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return <QuartersClient initialQuarters={quarters} role={role} />
}
