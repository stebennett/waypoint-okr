import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const quarter = await prisma.quarter.findUnique({
      where: { id: params.id },
      include: {
        objectives: {
          include: {
            team: true,
            tags: { include: { tag: true } },
            keyResults: {
              include: {
                checkIns: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
            children: {
              include: {
                team: true,
                keyResults: {
                  include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
                },
              },
            },
          },
        },
      },
    })
    if (!quarter) return NextResponse.json({ error: 'Quarter not found' }, { status: 404 })
    return NextResponse.json(quarter)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch quarter' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate)
    if (body.status !== undefined) data.status = body.status

    const quarter = await prisma.quarter.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(quarter)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Quarter not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to update quarter' }, { status: 500 })
  }
}
