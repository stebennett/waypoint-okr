import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const keyResults = await prisma.keyResult.findMany({
      where: { objectiveId: params.id },
      include: {
        checkIns: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(keyResults)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch key results' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Key result title is required' }, { status: 400 })
    }

    const keyResult = await prisma.keyResult.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        objectiveId: params.id,
      },
      include: {
        checkIns: { orderBy: { createdAt: 'desc' } },
      },
    })
    return NextResponse.json(keyResult, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create key result' }, { status: 500 })
  }
}
