import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { JiraError, fetchJiraProgress, getJiraConfig } from '@/lib/jira'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const kr = await prisma.keyResult.findUnique({
      where: { id },
      include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!kr) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
    }
    if (!kr.jiraJql) {
      return NextResponse.json(
        { error: 'Key result has no JIRA query linked' },
        { status: 400 }
      )
    }

    const config = getJiraConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'JIRA is not configured on this server' },
        { status: 503 }
      )
    }

    let sync
    try {
      sync = await fetchJiraProgress(config, kr.jiraJql)
    } catch (error) {
      if (error instanceof JiraError) {
        return NextResponse.json({ error: error.message }, { status: 502 })
      }
      throw error
    }

    const [, keyResult] = await prisma.$transaction([
      prisma.checkIn.create({
        data: {
          keyResultId: kr.id,
          progress: sync.progress,
          confidence: kr.checkIns[0]?.confidence ?? 50,
          notes: `JIRA sync: ${sync.done} of ${sync.total} issues done`,
          checkedInBy: 'JIRA Sync',
        },
      }),
      prisma.keyResult.update({
        where: { id: kr.id },
        data: { jiraSyncedAt: new Date() },
        include: { checkIns: { orderBy: { createdAt: 'desc' } } },
      }),
    ])

    return NextResponse.json({ keyResult, sync })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to sync key result' }, { status: 500 })
  }
}
