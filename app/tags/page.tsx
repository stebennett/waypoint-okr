import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { TagsClient } from './TagsClient'

export const dynamic = 'force-dynamic'

export default async function TagsPage() {
  const [tags, session] = await Promise.all([
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { objectives: true } },
      },
    }),
    getSession(),
  ])

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'viewer'

  return <TagsClient initialTags={tags} role={role} />
}
