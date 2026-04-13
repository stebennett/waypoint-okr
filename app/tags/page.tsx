import { prisma } from '@/lib/prisma'
import { TagsClient } from './TagsClient'

export const dynamic = 'force-dynamic'

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { objectives: true } },
    },
  })

  return <TagsClient initialTags={tags} />
}
