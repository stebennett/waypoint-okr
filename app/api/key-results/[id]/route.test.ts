import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    keyResult: {
      update: vi.fn(),
    },
  },
}))

import { PUT } from './route'
import { prisma } from '@/lib/prisma'

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/key-results/kr1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function routeParams(id = 'kr1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.keyResult.update).mockResolvedValue({ id: 'kr1' } as never)
})

describe('PUT /api/key-results/[id] jiraJql handling', () => {
  it('sets jiraJql, trimmed', async () => {
    const res = await PUT(request({ jiraJql: '  project = ABC  ' }), routeParams())

    expect(res.status).toBe(200)
    expect(prisma.keyResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { jiraJql: 'project = ABC' } })
    )
  })

  it('clears jiraJql when an empty value is sent', async () => {
    await PUT(request({ jiraJql: '' }), routeParams())

    expect(prisma.keyResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { jiraJql: null } })
    )
  })

  it('does not touch jiraJql when the field is absent', async () => {
    await PUT(request({ title: 'New title' }), routeParams())

    const { data } = vi.mocked(prisma.keyResult.update).mock.calls[0][0]
    expect('jiraJql' in data).toBe(false)
  })
})
