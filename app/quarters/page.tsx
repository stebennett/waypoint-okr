import { prisma } from '@/lib/prisma'
import { QuartersClient } from './QuartersClient'

export const dynamic = 'force-dynamic'

export default async function QuartersPage() {
  const quarters = await prisma.quarter.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { objectives: true } } },
  })

  return <QuartersClient initialQuarters={quarters} />
}
