import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  JiraError,
  buildDoneJql,
  computeProgress,
  countIssues,
  fetchJiraProgress,
  getJiraConfig,
} from './jira'

const config = {
  baseUrl: 'https://example.atlassian.net',
  email: 'user@example.com',
  apiToken: 'token123',
}

function mockFetch(...responses: Response[]) {
  const fn = vi.fn()
  responses.forEach((r) => fn.mockResolvedValueOnce(r))
  vi.stubGlobal('fetch', fn)
  return fn
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getJiraConfig', () => {
  it('returns null when any variable is missing', () => {
    expect(getJiraConfig({})).toBeNull()
    expect(getJiraConfig({ JIRA_BASE_URL: 'https://x.atlassian.net' })).toBeNull()
    expect(
      getJiraConfig({ JIRA_BASE_URL: 'https://x.atlassian.net', JIRA_EMAIL: 'a@b.c' })
    ).toBeNull()
  })

  it('returns config when all variables are set', () => {
    expect(
      getJiraConfig({
        JIRA_BASE_URL: 'https://x.atlassian.net',
        JIRA_EMAIL: 'a@b.c',
        JIRA_API_TOKEN: 't',
      })
    ).toEqual({ baseUrl: 'https://x.atlassian.net', email: 'a@b.c', apiToken: 't' })
  })

  it('strips a trailing slash from the base URL', () => {
    expect(
      getJiraConfig({
        JIRA_BASE_URL: 'https://x.atlassian.net/',
        JIRA_EMAIL: 'a@b.c',
        JIRA_API_TOKEN: 't',
      })?.baseUrl
    ).toBe('https://x.atlassian.net')
  })
})

describe('buildDoneJql', () => {
  it('wraps the query and appends the done filter', () => {
    expect(buildDoneJql('project = ABC')).toBe(
      '(project = ABC) AND statusCategory = Done'
    )
  })
})

describe('computeProgress', () => {
  it('returns 0 when the query matches no issues', () => {
    expect(computeProgress(0, 0)).toBe(0)
  })

  it('rounds to the nearest integer', () => {
    expect(computeProgress(1, 3)).toBe(33)
    expect(computeProgress(2, 3)).toBe(67)
  })

  it('returns 100 when everything is done', () => {
    expect(computeProgress(8, 8)).toBe(100)
  })
})

describe('countIssues', () => {
  it('returns the count from the approximate-count endpoint', async () => {
    const fetchMock = mockFetch(jsonResponse({ count: 42 }))

    await expect(countIssues(config, 'project = ABC')).resolves.toBe(42)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.atlassian.net/rest/api/3/search/approximate-count')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ jql: 'project = ABC' })
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('user@example.com:token123').toString('base64')}`
    )
  })

  it('falls back to the v2 search endpoint when approximate-count is unavailable', async () => {
    const fetchMock = mockFetch(
      new Response('Not Found', { status: 404 }),
      jsonResponse({ total: 7 })
    )

    await expect(countIssues(config, 'project = ABC')).resolves.toBe(7)

    const [url] = fetchMock.mock.calls[1]
    expect(url).toBe(
      `https://example.atlassian.net/rest/api/2/search?jql=${encodeURIComponent('project = ABC')}&maxResults=0`
    )
  })

  it('throws JiraError with details on auth failure', async () => {
    mockFetch(new Response('Unauthorized', { status: 401 }))

    await expect(countIssues(config, 'project = ABC')).rejects.toThrow(JiraError)
  })

  it('throws JiraError including JIRA error messages on bad JQL', async () => {
    mockFetch(
      jsonResponse({ errorMessages: ["Field 'projct' does not exist."] }, 400)
    )

    await expect(countIssues(config, 'projct = ABC')).rejects.toThrow(
      /Field 'projct' does not exist\./
    )
  })

  it('wraps network failures in JiraError', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    vi.stubGlobal('fetch', fn)

    await expect(countIssues(config, 'project = ABC')).rejects.toThrow(JiraError)
  })
})

describe('fetchJiraProgress', () => {
  it('returns total, done and computed progress', async () => {
    const fetchMock = mockFetch(jsonResponse({ count: 8 }), jsonResponse({ count: 5 }))

    await expect(fetchJiraProgress(config, 'project = ABC')).resolves.toEqual({
      total: 8,
      done: 5,
      progress: 63,
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).jql).toBe('project = ABC')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).jql).toBe(
      '(project = ABC) AND statusCategory = Done'
    )
  })

  it('returns zero progress without a done query when total is 0', async () => {
    const fetchMock = mockFetch(jsonResponse({ count: 0 }))

    await expect(fetchJiraProgress(config, 'project = EMPTY')).resolves.toEqual({
      total: 0,
      done: 0,
      progress: 0,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
