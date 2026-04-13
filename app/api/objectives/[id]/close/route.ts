import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { closeNote, keyResults } = body

    // Update KR final scores if provided
    if (keyResults && Array.isArray(keyResults)) {
      for (const kr of keyResults) {
        await prisma.keyResult.update({
          where: { id: kr.id },
          data: {
            finalScore: kr.finalScore !== undefined ? Number(kr.finalScore) : undefined,
            closeNote: kr.closeNote || null,
          },
        })
      }
    }

    const objective = await prisma.objective.update({
      where: { id: params.id },
      data: {
        status: 'closed',
        closeNote: closeNote || null,
        closedAt: new Date(),
      },
      include: {
        team: true,
        quarter: true,
        tags: { include: { tag: true } },
        keyResults: {
          include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    })
    return NextResponse.json(objective)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to close objective' }, { status: 500 })
  }
}
