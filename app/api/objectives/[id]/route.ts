import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const objective = await prisma.objective.findUnique({
      where: { id },
      include: {
        team: true,
        quarter: true,
        tags: { include: { tag: true } },
        parent: { select: { id: true, title: true, level: true } },
        children: {
          include: {
            team: true,
            keyResults: {
              include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
            },
          },
        },
        keyResults: {
          include: {
            checkIns: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    return NextResponse.json(objective)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch objective' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.level !== undefined) data.level = body.level
    if (body.teamId !== undefined) data.teamId = body.teamId || null
    if (body.parentId !== undefined) data.parentId = body.parentId || null
    if (body.status !== undefined) data.status = body.status

    // Handle tag updates
    if (body.tagIds !== undefined) {
      await prisma.objectiveTag.deleteMany({ where: { objectiveId: id } })
      if (body.tagIds.length > 0) {
        await prisma.objectiveTag.createMany({
          data: body.tagIds.map((tagId: string) => ({ objectiveId: id, tagId })),
        })
      }
    }

    const objective = await prisma.objective.update({
      where: { id },
      data,
      include: {
        team: true,
        quarter: true,
        tags: { include: { tag: true } },
        parent: { select: { id: true, title: true } },
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
    return NextResponse.json({ error: 'Failed to update objective' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.objective.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete objective' }, { status: 500 })
  }
}
