import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    keyResult: {
      create: vi.fn(),
    },
  },
}))

import { POST } from './route'
import { prisma } from '@/lib/prisma'

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/objectives/obj1/key-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function routeParams(id = 'obj1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.keyResult.create).mockResolvedValue({ id: 'kr1' } as never)
})

describe('POST /api/objectives/[id]/key-results jiraJql handling', () => {
  it('stores jiraJql when provided', async () => {
    const res = await POST(
      request({ title: 'Ship it', jiraJql: ' project = ABC ' }),
      routeParams()
    )

    expect(res.status).toBe(201)
    expect(prisma.keyResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jiraJql: 'project = ABC' }),
      })
    )
  })

  it('stores null jiraJql when omitted', async () => {
    await POST(request({ title: 'Ship it' }), routeParams())

    expect(prisma.keyResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jiraJql: null }),
      })
    )
  })
})
