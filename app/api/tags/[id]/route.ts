import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
      include: {
        objectives: {
          include: {
            objective: {
              include: {
                team: true,
                quarter: true,
                keyResults: {
                  include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
                },
              },
            },
          },
        },
      },
    })
    if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    return NextResponse.json(tag)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.tag.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
