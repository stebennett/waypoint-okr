import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JiraError } from '@/lib/jira'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    keyResult: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    checkIn: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/jira', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/jira')>()
  return {
    ...actual,
    getJiraConfig: vi.fn(),
    fetchJiraProgress: vi.fn(),
  }
})

import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { fetchJiraProgress, getJiraConfig } from '@/lib/jira'

const config = {
  baseUrl: 'https://example.atlassian.net',
  email: 'user@example.com',
  apiToken: 'token123',
}

function request() {
  return new Request('http://localhost/api/key-results/kr1/sync', { method: 'POST' })
}

function routeParams(id = 'kr1') {
  return { params: Promise.resolve({ id }) }
}

const baseKr = {
  id: 'kr1',
  title: 'Ship the thing',
  jiraJql: 'project = ABC',
  checkIns: [{ id: 'ci0', progress: 40, confidence: 70 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getJiraConfig).mockReturnValue(config)
  vi.mocked(prisma.keyResult.findUnique).mockResolvedValue(baseKr as never)
  vi.mocked(fetchJiraProgress).mockResolvedValue({ total: 8, done: 5, progress: 63 })
  vi.mocked(prisma.$transaction).mockResolvedValue([
    { id: 'ci1' },
    { ...baseKr, jiraSyncedAt: '2026-06-10T00:00:00.000Z' },
  ] as never)
})

describe('POST /api/key-results/[id]/sync', () => {
  it('returns 404 when the key result does not exist', async () => {
    vi.mocked(prisma.keyResult.findUnique).mockResolvedValue(null as never)

    const res = await POST(request(), routeParams('missing'))

    expect(res.status).toBe(404)
  })

  it('returns 400 when the key result has no JIRA query linked', async () => {
    vi.mocked(prisma.keyResult.findUnique).mockResolvedValue({
      ...baseKr,
      jiraJql: null,
    } as never)

    const res = await POST(request(), routeParams())

    expect(res.status).toBe(400)
  })

  it('returns 503 when JIRA is not configured', async () => {
    vi.mocked(getJiraConfig).mockReturnValue(null)

    const res = await POST(request(), routeParams())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/not configured/i)
  })

  it('returns 502 with the JIRA message when the query fails', async () => {
    vi.mocked(fetchJiraProgress).mockRejectedValue(
      new JiraError("JIRA query failed: Field 'projct' does not exist.")
    )

    const res = await POST(request(), routeParams())

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toMatch(/Field 'projct' does not exist\./)
  })

  it('creates a check-in from JIRA counts and stamps jiraSyncedAt', async () => {
    const res = await POST(request(), routeParams())

    expect(res.status).toBe(200)
    expect(fetchJiraProgress).toHaveBeenCalledWith(config, 'project = ABC')

    expect(prisma.checkIn.create).toHaveBeenCalledWith({
      data: {
        keyResultId: 'kr1',
        progress: 63,
        confidence: 70,
        notes: 'JIRA sync: 5 of 8 issues done',
        checkedInBy: 'JIRA Sync',
      },
    })
    expect(prisma.keyResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'kr1' },
        data: { jiraSyncedAt: expect.any(Date) },
      })
    )

    const body = await res.json()
    expect(body.sync).toEqual({ total: 8, done: 5, progress: 63 })
    expect(body.keyResult.id).toBe('kr1')
  })

  it('defaults confidence to 50 when there are no prior check-ins', async () => {
    vi.mocked(prisma.keyResult.findUnique).mockResolvedValue({
      ...baseKr,
      checkIns: [],
    } as never)

    await POST(request(), routeParams())

    expect(prisma.checkIn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ confidence: 50 }),
    })
  })
})
