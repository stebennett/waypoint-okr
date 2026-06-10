export interface JiraConfig {
  baseUrl: string
  email: string
  apiToken: string
}

export class JiraError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JiraError'
  }
}

export function getJiraConfig(
  env: Record<string, string | undefined> = process.env
): JiraConfig | null {
  const baseUrl = env.JIRA_BASE_URL
  const email = env.JIRA_EMAIL
  const apiToken = env.JIRA_API_TOKEN
  if (!baseUrl || !email || !apiToken) return null
  return { baseUrl: baseUrl.replace(/\/+$/, ''), email, apiToken }
}

export function buildDoneJql(jql: string): string {
  return `(${jql}) AND statusCategory = Done`
}

export function computeProgress(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

function authHeaders(config: JiraConfig): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
    Accept: 'application/json',
  }
}

async function jiraErrorFromResponse(res: Response, context: string): Promise<JiraError> {
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    if (Array.isArray(body?.errorMessages) && body.errorMessages.length > 0) {
      detail = body.errorMessages.join(' ')
    }
  } catch {
    // non-JSON body; keep the HTTP status as the detail
  }
  return new JiraError(`${context}: ${detail}`)
}

export async function countIssues(config: JiraConfig, jql: string): Promise<number> {
  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/rest/api/3/search/approximate-count`, {
      method: 'POST',
      headers: { ...authHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql }),
    })
  } catch (error) {
    throw new JiraError(`Could not reach JIRA: ${(error as Error).message}`)
  }

  // JIRA Server/Data Center does not have approximate-count; fall back to v2 search
  if (res.status === 404 || res.status === 405) {
    return countIssuesV2(config, jql)
  }
  if (!res.ok) {
    throw await jiraErrorFromResponse(res, 'JIRA query failed')
  }
  const body = await res.json()
  return Number(body.count)
}

async function countIssuesV2(config: JiraConfig, jql: string): Promise<number> {
  let res: Response
  try {
    res = await fetch(
      `${config.baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=0`,
      { headers: authHeaders(config) }
    )
  } catch (error) {
    throw new JiraError(`Could not reach JIRA: ${(error as Error).message}`)
  }
  if (!res.ok) {
    throw await jiraErrorFromResponse(res, 'JIRA query failed')
  }
  const body = await res.json()
  return Number(body.total)
}

export interface JiraProgress {
  total: number
  done: number
  progress: number
}

export async function fetchJiraProgress(config: JiraConfig, jql: string): Promise<JiraProgress> {
  const total = await countIssues(config, jql)
  if (total === 0) return { total: 0, done: 0, progress: 0 }
  const done = await countIssues(config, buildDoneJql(jql))
  return { total, done, progress: computeProgress(done, total) }
}
