import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

import { GET } from './route'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('returns ok when the database responds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([1] as never)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('returns 503 when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('db down'))
    const res = await GET()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ status: 'error' })
  })
})
